import { db } from '../../db';
import { obligations, notifications, subscriptions, users, organizations, userSettings } from '../../db/schema';
import { eq, and, isNull, inArray, desc } from 'drizzle-orm';
import { PLAN_LIMITS, type Tier } from '../../lib/plan-limits';
import { createNotification } from '../../services/notification.service';
import { getTodayInTimezone, isInDeliveryWindow } from '../../lib/date-math';

export async function processNotificationScheduler() {
  // 1. Fetch all active obligations (excluding soft-deleted orgs)
  const allObligations = await db
    .select({
      id: obligations.id,
      organizationId: obligations.organizationId,
      userId: obligations.userId,
      name: obligations.name,
      category: obligations.category,
      dueDate: obligations.dueDate,
      completed: obligations.completed,
      notificationsMuted: obligations.notificationsMuted,
      notificationChannels: obligations.notificationChannels,
      reminderDaysBefore: obligations.reminderDaysBefore,
      reminderFrequency: obligations.reminderFrequency,
      reminderDates: obligations.reminderDates,
      reminderTime: obligations.reminderTime,
    })
    .from(obligations)
    .innerJoin(organizations, eq(organizations.id, obligations.organizationId))
    .where(and(eq(obligations.completed, false), isNull(obligations.deletedAt), isNull(organizations.deletedAt)));

  if (allObligations.length === 0) return;

  const now = new Date();

  // 2. Pre-fetch users (with timezone) and user settings in bulk
  const userIds = [...new Set(allObligations.map((o) => o.userId))];

  const allUsers = await db
    .select({ id: users.id, phone: users.phone, email: users.email, phoneVerified: users.phoneVerified, timezone: users.timezone })
    .from(users)
    .where(inArray(users.id, userIds));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allSettings = await db
    .select({ userId: userSettings.userId, defaultReminder: userSettings.defaultReminder })
    .from(userSettings)
    .where(inArray(userSettings.userId, userIds));
  const settingsMap = new Map(allSettings.map((s) => [s.userId, s]));

  // 3. Filter to eligible obligations based on reminder dates or legacy window
  const eligibleObligations = allObligations.filter((obl) => {
    if (obl.notificationsMuted) return false;

    const user = userMap.get(obl.userId);
    const timezone = user?.timezone ?? 'America/New_York';
    const settings = settingsMap.get(obl.userId);
    const effectiveTime = obl.reminderTime ?? settings?.defaultReminder?.time ?? '09:00';

    // Check if we're in the delivery window for this user's preferred time
    if (!isInDeliveryWindow(effectiveTime, timezone, now)) return false;

    const reminderDates = (obl.reminderDates ?? []) as string[];
    const frequency = obl.reminderFrequency ?? 'once';

    if (frequency === 'custom') {
      // Custom mode: only fire on explicit dates (empty = no reminders)
      if (reminderDates.length === 0) return false;
      const todayInTz = getTodayInTimezone(timezone);
      return reminderDates.includes(todayInTz);
    } else if (reminderDates.length > 0) {
      // Rule-based mode with pre-computed dates: check if today is in the list
      const todayInTz = getTodayInTimezone(timezone);
      return reminderDates.includes(todayInTz);
    } else {
      // Legacy path: rule-based check (obligations without reminderDates)
      const dueDate = new Date(obl.dueDate + 'T00:00:00');
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= obl.reminderDaysBefore;
    }
  });

  if (eligibleObligations.length === 0) return;

  const obligationIds = eligibleObligations.map((o) => o.id);

  // 4. Batch-fetch latest notifications for all eligible obligations
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

  // 5. Determine which obligations actually need notifications
  const obligationsNeedingNotif = eligibleObligations.filter((obl) => {
    const lastNotif = latestNotifMap.get(obl.id);
    if (!lastNotif) return true;

    const reminderDates = (obl.reminderDates ?? []) as string[];
    const frequency = obl.reminderFrequency ?? 'once';

    if (frequency === 'custom' || reminderDates.length > 0) {
      // Date-based deduplication: check if a notification was already triggered today
      const user = userMap.get(obl.userId);
      const timezone = user?.timezone ?? 'America/New_York';
      const todayInTz = getTodayInTimezone(timezone);
      const lastTriggeredDate = lastNotif.triggeredAt.toLocaleDateString('en-CA', { timeZone: timezone });
      return lastTriggeredDate !== todayInTz;
    } else {
      // Legacy path: frequency-based deduplication
      const lastTime = lastNotif.triggeredAt.getTime();
      const elapsed = now.getTime() - lastTime;

      if (frequency === 'once') return false;
      if (frequency === 'daily' && elapsed < 24 * 60 * 60 * 1000) return false;
      if (frequency === 'weekly' && elapsed < 7 * 24 * 60 * 60 * 1000) return false;
      return true;
    }
  });

  if (obligationsNeedingNotif.length === 0) return;

  // 6. Pre-fetch org owners and subscriptions in bulk
  const orgIds = [...new Set(obligationsNeedingNotif.map((o) => o.organizationId))];

  const orgOwners = await db
    .select({ orgId: organizations.id, ownerId: organizations.ownerId })
    .from(organizations)
    .where(inArray(organizations.id, orgIds));
  const orgOwnerMap = new Map(orgOwners.map((o) => [o.orgId, o.ownerId]));

  const ownerIds = [...new Set(orgOwners.map((o) => o.ownerId))];
  const allSubs = ownerIds.length > 0
    ? await db
        .select({ userId: subscriptions.userId, tier: subscriptions.tier, smsUsed: subscriptions.smsUsedThisMonth })
        .from(subscriptions)
        .where(inArray(subscriptions.userId, ownerIds))
    : [];
  const subMap = new Map(allSubs.map((s) => [s.userId, s]));

  // 7. Create notifications with appropriate delivery status
  for (const obl of obligationsNeedingNotif) {
    const dueDate = new Date(obl.dueDate + 'T00:00:00');
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const channels = (obl.notificationChannels ?? []) as string[];
    const message = `"${obl.name}" is due ${daysUntilDue <= 0 ? 'today or overdue' : `in ${daysUntilDue} day(s)`}`;

    for (const channel of channels) {
      let deliveryStatus: 'pending' | 'skipped' = 'skipped';

      if (channel === 'sms') {
        const user = userMap.get(obl.userId);
        if (user?.phone && user.phoneVerified) {
          const ownerId = orgOwnerMap.get(obl.organizationId);
          const sub = ownerId ? subMap.get(ownerId) : undefined;
          const tier = (sub?.tier ?? 'solo') as Tier;
          const limit = PLAN_LIMITS[tier].smsPerMonth;
          const used = sub?.smsUsed ?? 0;
          if (used < limit) {
            deliveryStatus = 'pending';
          }
        }
      } else if (channel === 'email') {
        const user = userMap.get(obl.userId);
        if (user?.email) {
          deliveryStatus = 'pending';
        }
      }
      // browser → stays 'skipped'

      await createNotification({
        organizationId: obl.organizationId,
        userId: obl.userId,
        obligationId: obl.id,
        obligationName: obl.name,
        channel,
        message,
        deliveryStatus,
      });
    }
  }
}
