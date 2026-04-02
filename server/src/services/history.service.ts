import { db } from '../db';
import { historyEntries, users, historyEntityTypeEnum, historyActionEnum } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

type EntityType = (typeof historyEntityTypeEnum.enumValues)[number];
type HistoryAction = (typeof historyActionEnum.enumValues)[number];

export async function listHistory(orgId: string, userId?: string) {
  const conditions = [eq(historyEntries.organizationId, orgId)];
  if (userId) {
    conditions.push(eq(historyEntries.userId, userId));
  }

  const rows = await db
    .select({
      id: historyEntries.id,
      organizationId: historyEntries.organizationId,
      userId: historyEntries.userId,
      entityType: historyEntries.entityType,
      entityId: historyEntries.entityId,
      entityName: historyEntries.entityName,
      action: historyEntries.action,
      before: historyEntries.before,
      after: historyEntries.after,
      undone: historyEntries.undone,
      renewedId: historyEntries.renewedId,
      createdAt: historyEntries.createdAt,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(historyEntries)
    .leftJoin(users, eq(historyEntries.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(historyEntries.createdAt))
    .limit(200);

  return rows;
}

export async function createHistoryEntry(
  orgId: string,
  userId: string,
  data: {
    entityType: EntityType;
    entityId: string;
    entityName: string;
    action: HistoryAction;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    renewedId?: string;
  },
) {
  const [entry] = await db
    .insert(historyEntries)
    .values({
      organizationId: orgId,
      userId,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      action: data.action,
      before: data.before,
      after: data.after,
      renewedId: data.renewedId ?? null,
    })
    .returning();
  return entry;
}

export async function updateHistoryEntry(
  orgId: string,
  id: string,
  updates: { undone: boolean },
) {
  const [entry] = await db
    .update(historyEntries)
    .set({ undone: updates.undone })
    .where(and(eq(historyEntries.id, id), eq(historyEntries.organizationId, orgId)))
    .returning();
  return entry;
}

export async function clearHistory(orgId: string, userId?: string) {
  const conditions = [eq(historyEntries.organizationId, orgId)];
  if (userId) {
    conditions.push(eq(historyEntries.userId, userId));
  }
  await db.delete(historyEntries).where(and(...conditions));
}
