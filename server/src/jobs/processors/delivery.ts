import { db } from '../../db';
import { notifications, users } from '../../db/schema';
import { eq, and, lt, asc, inArray } from 'drizzle-orm';
import { sendSms } from '../../services/sms.service';
import { emailClient } from '../../lib/resend';
import { logger } from '../../lib/logger';

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

export async function processDelivery() {
  const pending = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      channel: notifications.channel,
      message: notifications.message,
      obligationName: notifications.obligationName,
      deliveryAttempts: notifications.deliveryAttempts,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.deliveryStatus, 'pending'),
        lt(notifications.deliveryAttempts, MAX_ATTEMPTS),
      ),
    )
    .orderBy(asc(notifications.triggeredAt))
    .limit(BATCH_SIZE);

  if (pending.length === 0) return;

  // Pre-fetch user data for the batch
  const userIds = [...new Set(pending.map((n) => n.userId))];
  const userRows = await db
    .select({ id: users.id, phone: users.phone, email: users.email, phoneVerified: users.phoneVerified })
    .from(users)
    .where(inArray(users.id, userIds));
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  for (const notif of pending) {
    const user = userMap.get(notif.userId);
    if (!user) continue;

    try {
      if (notif.channel === 'sms') {
        if (!user.phone || !user.phoneVerified) throw new Error('User has no verified phone number');
        await sendSms(notif.userId, user.phone, notif.message);
      } else if (notif.channel === 'email') {
        if (!user.email) throw new Error('User has no email');
        await emailClient.sendEmail({
          to: user.email,
          subject: `Practice Atlas Reminder: ${notif.obligationName}`,
          html: notif.message,
        });
      }

      await db
        .update(notifications)
        .set({
          deliveryStatus: 'delivered',
          deliveryAttempts: notif.deliveryAttempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notif.id));
    } catch (err) {
      const attempts = notif.deliveryAttempts + 1;
      await db
        .update(notifications)
        .set({
          deliveryAttempts: attempts,
          deliveryError: String(err),
          ...(attempts >= MAX_ATTEMPTS ? { deliveryStatus: 'failed' as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, notif.id));

      logger.error('Delivery failed', {
        notificationId: notif.id,
        channel: notif.channel,
        attempt: attempts,
        error: String(err),
      });
    }
  }
}
