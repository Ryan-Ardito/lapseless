import { db } from '../db';
import { notifications } from '../db/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { triggerJob } from '../jobs/trigger';

export async function listNotifications(orgId: string, userId: string) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.organizationId, orgId), eq(notifications.userId, userId), isNull(notifications.deletedAt)))
    .orderBy(desc(notifications.triggeredAt));
}

export async function createNotification(data: {
  organizationId: string;
  userId: string;
  obligationId?: string;
  obligationName?: string;
  channel: string;
  message: string;
  deliveryStatus?: 'pending' | 'delivered' | 'failed' | 'skipped';
  scheduledDate?: string;
  deliverAfter?: Date;
}) {
  const rows = await db
    .insert(notifications)
    .values({
      organizationId: data.organizationId,
      userId: data.userId,
      obligationId: data.obligationId,
      obligationName: data.obligationName,
      channel: data.channel as any,
      message: data.message,
      ...(data.deliveryStatus ? { deliveryStatus: data.deliveryStatus } : {}),
      ...(data.scheduledDate ? { scheduledDate: data.scheduledDate } : {}),
      ...(data.deliverAfter ? { deliverAfter: data.deliverAfter } : {}),
    })
    .onConflictDoUpdate({
      target: [notifications.obligationId, notifications.channel, notifications.scheduledDate],
      targetWhere: sql`${notifications.obligationId} IS NOT NULL AND ${notifications.scheduledDate} IS NOT NULL`,
      set: {
        deliveryStatus: sql`EXCLUDED.delivery_status`,
        message: sql`EXCLUDED.message`,
        deliverAfter: sql`EXCLUDED.deliver_after`,
        updatedAt: new Date(),
      },
      setWhere: sql`${notifications.deliveryStatus} = 'skipped' AND EXCLUDED.delivery_status = 'pending'`,
    })
    .returning();
  const created = rows[0] ?? null;
  if (created?.deliveryStatus === 'pending') triggerJob('delivery');
  return created;
}

export async function markAllRead(orgId: string, userId: string) {
  await db
    .update(notifications)
    .set({ read: true, updatedAt: new Date() })
    .where(and(eq(notifications.organizationId, orgId), eq(notifications.userId, userId), eq(notifications.read, false)));
}

export async function clearAll(orgId: string, userId: string) {
  await db
    .update(notifications)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.organizationId, orgId), eq(notifications.userId, userId), isNull(notifications.deletedAt)));
}
