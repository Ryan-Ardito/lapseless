import { db } from '../db';
import { checklistTemplates } from '../db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

export async function listTemplates(orgId: string, userId: string) {
  return db
    .select()
    .from(checklistTemplates)
    .where(
      and(
        eq(checklistTemplates.organizationId, orgId),
        or(isNull(checklistTemplates.userId), eq(checklistTemplates.userId, userId)),
      ),
    )
    .orderBy(checklistTemplates.createdAt);
}

export async function getTemplate(orgId: string, id: string) {
  const [template] = await db
    .select()
    .from(checklistTemplates)
    .where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.organizationId, orgId)))
    .limit(1);
  return template;
}

export async function createTemplate(
  orgId: string,
  userId: string | null,
  data: { name: string; items: string[] },
) {
  const [template] = await db
    .insert(checklistTemplates)
    .values({
      organizationId: orgId,
      userId,
      name: data.name,
      items: data.items,
    })
    .returning();
  return template;
}

export async function updateTemplate(
  orgId: string,
  id: string,
  updates: Partial<{ name: string; items: string[] }>,
) {
  const [template] = await db
    .update(checklistTemplates)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.organizationId, orgId)))
    .returning();
  return template;
}

export async function deleteTemplate(orgId: string, id: string) {
  const result = await db
    .delete(checklistTemplates)
    .where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.organizationId, orgId)))
    .returning();
  return result.length > 0;
}
