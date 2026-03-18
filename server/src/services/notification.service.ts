import { db } from '../db';
import { notifications } from '../db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

export async function listNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.deletedAt)))
    .orderBy(desc(notifications.triggeredAt));
}

export async function createNotification(data: {
  userId: string;
  obligationId?: string;
  obligationName: string;
  channel: string;
  message: string;
  deliveryStatus?: 'pending' | 'delivered' | 'failed' | 'skipped';
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      obligationId: data.obligationId,
      obligationName: data.obligationName,
      channel: data.channel as any,
      message: data.message,
      ...(data.deliveryStatus ? { deliveryStatus: data.deliveryStatus } : {}),
    })
    .returning();
  return notification;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

export async function clearAll(userId: string) {
  await db
    .update(notifications)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.deletedAt)));
}
