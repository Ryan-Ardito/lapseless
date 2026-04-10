import { db } from '../db';
import { checklists } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function listChecklists(orgId: string, userId?: string) {
  const conditions = [eq(checklists.organizationId, orgId), isNull(checklists.deletedAt)];
  if (userId) {
    conditions.push(eq(checklists.userId, userId));
  }
  return db
    .select()
    .from(checklists)
    .where(and(...conditions));
}

export async function getChecklist(orgId: string, id: string) {
  const [checklist] = await db
    .select()
    .from(checklists)
    .where(and(eq(checklists.id, id), eq(checklists.organizationId, orgId)))
    .limit(1);
  return checklist;
}

export async function createChecklist(
  orgId: string,
  userId: string,
  data: {
    type: string;
    title: string;
    period: string;
    dueDate?: string;
    items: { id: string; label: string; completed: boolean; notes?: string }[];
  },
) {
  const [checklist] = await db
    .insert(checklists)
    .values({
      organizationId: orgId,
      userId,
      type: data.type as any,
      title: data.title,
      period: data.period,
      dueDate: data.dueDate,
      items: data.items,
    })
    .returning();
  return checklist;
}

export async function updateChecklist(orgId: string, id: string, updates: Partial<{
  title: string;
  period: string;
  items: { id: string; label: string; completed: boolean; notes?: string }[];
  completedAt: Date | null;
}>) {
  const [checklist] = await db
    .update(checklists)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(checklists.id, id), eq(checklists.organizationId, orgId)))
    .returning();
  return checklist;
}

export async function softDeleteChecklist(orgId: string, id: string) {
  const [checklist] = await db
    .update(checklists)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(checklists.id, id), eq(checklists.organizationId, orgId)))
    .returning();
  return checklist;
}

export async function restoreChecklist(orgId: string, id: string) {
  const [checklist] = await db
    .update(checklists)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(checklists.id, id), eq(checklists.organizationId, orgId)))
    .returning();
  return checklist;
}
