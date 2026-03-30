import { db } from '../../db';
import { notifications, users, obligations, organizations } from '../../db/schema';
import { eq, and, lt, asc, inArray, or, lte, sql } from 'drizzle-orm';
import { sendSms } from '../../services/sms.service';
import { sendObligationReminderEmail } from '../../services/email.service';
import { logger } from '../../lib/logger';

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 8;
const BASE_RETRY_DELAY_MINUTES = 2;

/** Regenerate the notification message with accurate days-until-due. */
function freshMessage(obligationName: string, dueDate: string | null): string {
  if (!dueDate) return `Reminder: "${obligationName}"`;
  const due = new Date(dueDate + 'T00:00:00');
  const daysUntilDue = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return `"${obligationName}" is due ${daysUntilDue <= 0 ? 'today or overdue' : `in ${daysUntilDue} day(s)`}`;
}

export async function processDelivery() {
  const today = new Date().toISOString().split('T')[0];

  const pending = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      organizationId: notifications.organizationId,
      channel: notifications.channel,
      message: notifications.message,
      obligationName: notifications.obligationName,
      deliveryAttempts: notifications.deliveryAttempts,
      scheduledDate: notifications.scheduledDate,
      dueDate: obligations.dueDate,
    })
    .from(notifications)
    .leftJoin(obligations, eq(notifications.obligationId, obligations.id))
    .where(
      and(
        eq(notifications.deliveryStatus, 'pending'),
        lt(notifications.deliveryAttempts, MAX_ATTEMPTS),
        lte(sql`coalesce(${notifications.deliverAfter}, ${notifications.triggeredAt})`, sql`now()`),
        or(
          eq(notifications.deliveryAttempts, 0),
          lte(
            sql`${notifications.updatedAt} + make_interval(mins => ${BASE_RETRY_DELAY_MINUTES} * power(2, ${notifications.deliveryAttempts} - 1)::int)`,
            sql`now()`,
          ),
        ),
      ),
    )
    .orderBy(asc(notifications.triggeredAt))
    .limit(BATCH_SIZE);

  if (pending.length === 0) return;

  // Pre-fetch user data and org owners for the batch
  const userIds = [...new Set(pending.map((n) => n.userId))];
  const orgIds = [...new Set(pending.map((n) => n.organizationId))];

  const userRows = await db
    .select({ id: users.id, name: users.name, phone: users.phone, email: users.email, phoneVerified: users.phoneVerified })
    .from(users)
    .where(inArray(users.id, userIds));
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  // Resolve org → owner for SMS billing
  const orgOwnerRows = orgIds.length > 0
    ? await db.select({ orgId: organizations.id, ownerId: organizations.ownerId }).from(organizations).where(inArray(organizations.id, orgIds))
    : [];
  const orgOwnerMap = new Map(orgOwnerRows.map((o) => [o.orgId, o.ownerId]));

  for (const notif of pending) {
    const user = userMap.get(notif.userId);
    if (!user) continue;

    // Claim this notification with optimistic locking to prevent double-delivery
    const [claimed] = await db
      .update(notifications)
      .set({
        deliveryAttempts: notif.deliveryAttempts + 1,
        updatedAt: new Date(),
      })
      .where(and(
        eq(notifications.id, notif.id),
        eq(notifications.deliveryAttempts, notif.deliveryAttempts),
      ))
      .returning({ id: notifications.id, deliveryAttempts: notifications.deliveryAttempts });

    if (!claimed) continue; // Another worker already claimed this notification

    try {
      // Regenerate message if the notification is stale (scheduled for a past date)
      const message = notif.scheduledDate && notif.scheduledDate < today
        ? freshMessage(notif.obligationName, notif.dueDate)
        : notif.message;

      if (notif.channel === 'sms') {
        if (!user.phone || !user.phoneVerified) throw new Error('User has no verified phone number');
        const ownerId = orgOwnerMap.get(notif.organizationId);
        if (!ownerId) throw new Error(`No org owner found for org ${notif.organizationId}`);
        await sendSms(ownerId, user.phone, message);
      } else if (notif.channel === 'email') {
        if (!user.email) throw new Error('User has no email');
        await sendObligationReminderEmail(user.email, {
          name: user.name ?? 'there',
          obligationName: notif.obligationName,
          dueDate: notif.dueDate ?? undefined,
          message,
        });
      }

      await db
        .update(notifications)
        .set({
          deliveryStatus: 'delivered',
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notif.id));
    } catch (err) {
      await db
        .update(notifications)
        .set({
          deliveryError: String(err),
          ...(claimed.deliveryAttempts >= MAX_ATTEMPTS ? { deliveryStatus: 'failed' as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notif.id));

      logger.error('Delivery failed', {
        notificationId: notif.id,
        channel: notif.channel,
        attempt: claimed.deliveryAttempts,
        error: String(err),
      });
    }
  }
}
