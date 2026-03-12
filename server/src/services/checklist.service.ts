import { db } from '../db';
import { checklists } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function listChecklists(userId: string) {
  return db
    .select()
    .from(checklists)
    .where(and(eq(checklists.userId, userId), isNull(checklists.deletedAt)));
}

export async function createChecklist(
  userId: string,
  data: {
    type: string;
    title: string;
    period: string;
    items: { id: string; label: string; completed: boolean; notes?: string }[];
  },
) {
  const [checklist] = await db
    .insert(checklists)
    .values({
      userId,
      type: data.type as any,
      title: data.title,
      period: data.period,
      items: data.items,
    })
    .returning();
  return checklist;
}

export async function updateChecklist(userId: string, id: string, updates: Partial<{
  title: string;
  period: string;
  items: { id: string; label: string; completed: boolean; notes?: string }[];
}>) {
  const [checklist] = await db
    .update(checklists)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
    .returning();
  return checklist;
}

export async function softDeleteChecklist(userId: string, id: string) {
  const [checklist] = await db
    .update(checklists)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(checklists.id, id), eq(checklists.userId, userId)))
    .returning();
  return checklist;
}
