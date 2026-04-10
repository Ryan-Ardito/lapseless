import { db } from '../db';
import { ptoEntries, ptoConfig, ptoTypeEnum, organizations } from '../db/schema';
import { eq, and, isNull, lte, gte } from 'drizzle-orm';

type PtoType = (typeof ptoTypeEnum.enumValues)[number];
type PtoEntryInsert = typeof ptoEntries.$inferInsert;

export async function listEntries(orgId: string, userId: string, year?: number) {
  const conditions = [eq(ptoEntries.organizationId, orgId), eq(ptoEntries.userId, userId), isNull(ptoEntries.deletedAt)];

  if (year) {
    conditions.push(lte(ptoEntries.startDate, `${year}-12-31`));
    conditions.push(gte(ptoEntries.endDate, `${year}-01-01`));
  }

  return db
    .select()
    .from(ptoEntries)
    .where(and(...conditions));
}

export async function createEntry(
  orgId: string,
  userId: string,
  data: { startDate: string; endDate: string; hours: number; type: PtoType; notes?: string },
) {
  const [entry] = await db
    .insert(ptoEntries)
    .values({
      organizationId: orgId,
      userId,
      startDate: data.startDate,
      endDate: data.endDate,
      hours: data.hours,
      type: data.type,
      notes: data.notes,
    })
    .returning();
  return entry;
}

export async function updateEntry(orgId: string, userId: string | undefined, id: string, updates: Partial<{
  startDate: string;
  endDate: string;
  hours: number;
  type: PtoType;
  notes: string | null;
}>) {
  const setValues: Partial<PtoEntryInsert> = { ...updates, updatedAt: new Date() };
  const conditions = [eq(ptoEntries.id, id), eq(ptoEntries.organizationId, orgId)];
  if (userId) conditions.push(eq(ptoEntries.userId, userId));
  const [entry] = await db
    .update(ptoEntries)
    .set(setValues)
    .where(and(...conditions))
    .returning();
  return entry;
}

export async function softDeleteEntry(orgId: string, userId: string | undefined, id: string) {
  const conditions = [eq(ptoEntries.id, id), eq(ptoEntries.organizationId, orgId)];
  if (userId) conditions.push(eq(ptoEntries.userId, userId));
  const [entry] = await db
    .update(ptoEntries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(...conditions))
    .returning();
  return entry;
}

export async function restoreEntry(orgId: string, userId: string | undefined, id: string) {
  const conditions = [eq(ptoEntries.id, id), eq(ptoEntries.organizationId, orgId)];
  if (userId) conditions.push(eq(ptoEntries.userId, userId));
  const [entry] = await db
    .update(ptoEntries)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(...conditions))
    .returning();
  return entry;
}

export async function getConfig(orgId: string, userId: string, year: number) {
  const [config] = await db
    .select()
    .from(ptoConfig)
    .where(and(eq(ptoConfig.organizationId, orgId), eq(ptoConfig.userId, userId), eq(ptoConfig.year, year)))
    .limit(1);
  if (config) return config;

  const [org] = await db
    .select({ defaultPtoAllowance: organizations.defaultPtoAllowance })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return { yearlyAllowance: org?.defaultPtoAllowance ?? 160, year };
}

export async function upsertConfig(orgId: string, userId: string, data: { yearlyAllowance: number; year: number }) {
  const [config] = await db
    .insert(ptoConfig)
    .values({
      organizationId: orgId,
      userId,
      yearlyAllowance: data.yearlyAllowance,
      year: data.year,
    })
    .onConflictDoUpdate({
      target: [ptoConfig.organizationId, ptoConfig.userId, ptoConfig.year],
      set: { yearlyAllowance: data.yearlyAllowance },
    })
    .returning();
  return config;
}
