import type { Job } from 'bullmq';
import { db } from '../../db';
import { obligations, notifications, subscriptions, users } from '../../db/schema';
import { eq, and, isNull, inArray, desc } from 'drizzle-orm';
import { smsSenderQueue, emailSenderQueue } from '../queues';
import { PLAN_LIMITS, type Tier } from '../../lib/plan-limits';
import { createNotification } from '../../services/notification.service';

export async function processNotificationScheduler(_job: Job) {
  // 1. Fetch all active obligations in a single query
  const allObligations = await db
    .select()
    .from(obligations)
    .where(and(eq(obligations.completed, false), isNull(obligations.deletedAt)));

  if (allObligations.length === 0) return;

  const now = new Date();

  // Filter to obligations within their reminder window
  const eligibleObligations = allObligations.filter((obl) => {
    if (obl.notificationsMuted) return false;
    const dueDate = new Date(obl.dueDate + 'T00:00:00');
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= obl.reminderDaysBefore;
  });

  if (eligibleObligations.length === 0) return;

  const obligationIds = eligibleObligations.map((o) => o.id);

  // 2. Batch-fetch latest notifications for all eligible obligations
  const allNotifications = await db
    .select()
    .from(notifications)
    .where(inArray(notifications.obligationId, obligationIds))
    .orderBy(desc(notifications.triggeredAt));

  // Build a map of obligationId → latest notification
  const latestNotifMap = new Map<string, typeof allNotifications[number]>();
  for (const notif of allNotifications) {
    if (notif.obligationId && !latestNotifMap.has(notif.obligationId)) {
      latestNotifMap.set(notif.obligationId, notif);
    }
  }

  // Determine which obligations actually need notifications
  const obligationsNeedingNotif = eligibleObligations.filter((obl) => {
    const lastNotif = latestNotifMap.get(obl.id);
    if (!lastNotif) return true;

    const lastTime = lastNotif.triggeredAt.getTime();
    const frequency = obl.reminderFrequency ?? 'once';
    const elapsed = now.getTime() - lastTime;

    if (frequency === 'once') return false;
    if (frequency === 'daily' && elapsed < 24 * 60 * 60 * 1000) return false;
    if (frequency === 'weekly' && elapsed < 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  });

  if (obligationsNeedingNotif.length === 0) return;

  // 3. Pre-fetch all needed users and subscriptions in bulk
  const userIds = [...new Set(obligationsNeedingNotif.map((o) => o.userId))];

  const allUsers = await db
    .select({ id: users.id, phone: users.phone, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allSubs = await db
    .select({ userId: subscriptions.userId, tier: subscriptions.tier, smsUsed: subscriptions.smsUsedThisMonth })
    .from(subscriptions)
    .where(inArray(subscriptions.userId, userIds));
  const subMap = new Map(allSubs.map((s) => [s.userId, s]));

  // 4. Process in-memory
  for (const obl of obligationsNeedingNotif) {
    const dueDate = new Date(obl.dueDate + 'T00:00:00');
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const channels = (obl.notificationChannels ?? []) as string[];
    const message = `Reminder: "${obl.name}" is due ${daysUntilDue <= 0 ? 'today or overdue' : `in ${daysUntilDue} day(s)`}`;

    for (const channel of channels) {
      await createNotification({
        userId: obl.userId,
        obligationId: obl.id,
        obligationName: obl.name,
        channel,
        message,
      });

      if (channel === 'sms') {
        const user = userMap.get(obl.userId);
        if (user?.phone) {
          const sub = subMap.get(obl.userId);
          const tier = (sub?.tier ?? 'solo') as Tier;
          const limit = PLAN_LIMITS[tier].smsPerMonth;
          const used = sub?.smsUsed ?? 0;

          if (used < limit) {
            await smsSenderQueue.add('send-sms', {
              userId: obl.userId,
              phone: user.phone,
              message,
              obligationId: obl.id,
            });
          }
        }
      }

      if (channel === 'email') {
        const user = userMap.get(obl.userId);
        if (user?.email) {
          await emailSenderQueue.add('send-email', {
            to: user.email,
            subject: `Lapseless Reminder: ${obl.name}`,
            body: message,
          });
        }
      }
    }
  }
}
