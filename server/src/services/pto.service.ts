import { db } from '../db';
import { ptoEntries, ptoConfig, ptoTypeEnum } from '../db/schema';
import { eq, and, isNull, like } from 'drizzle-orm';

type PtoType = (typeof ptoTypeEnum.enumValues)[number];
type PtoEntryInsert = typeof ptoEntries.$inferInsert;

export async function listEntries(userId: string, year?: number) {
  const conditions = [eq(ptoEntries.userId, userId), isNull(ptoEntries.deletedAt)];

  if (year) {
    conditions.push(like(ptoEntries.date, `${year}%`));
  }

  return db
    .select()
    .from(ptoEntries)
    .where(and(...conditions));
}

export async function createEntry(
  userId: string,
  data: { date: string; hours: number; type: PtoType; notes?: string },
) {
  const [entry] = await db
    .insert(ptoEntries)
    .values({
      userId,
      date: data.date,
      hours: data.hours,
      type: data.type,
      notes: data.notes,
    })
    .returning();
  return entry;
}

export async function updateEntry(userId: string, id: string, updates: Partial<{
  date: string;
  hours: number;
  type: PtoType;
  notes: string | null;
}>) {
  const setValues: Partial<PtoEntryInsert> = { ...updates, updatedAt: new Date() };
  const [entry] = await db
    .update(ptoEntries)
    .set(setValues)
    .where(and(eq(ptoEntries.id, id), eq(ptoEntries.userId, userId)))
    .returning();
  return entry;
}

export async function softDeleteEntry(userId: string, id: string) {
  const [entry] = await db
    .update(ptoEntries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(ptoEntries.id, id), eq(ptoEntries.userId, userId)))
    .returning();
  return entry;
}

export async function getConfig(userId: string, year: number) {
  const [config] = await db
    .select()
    .from(ptoConfig)
    .where(and(eq(ptoConfig.userId, userId), eq(ptoConfig.year, year)))
    .limit(1);

  return config ?? { yearlyAllowance: 160, year };
}

export async function upsertConfig(userId: string, data: { yearlyAllowance: number; year: number }) {
  const existing = await db
    .select()
    .from(ptoConfig)
    .where(and(eq(ptoConfig.userId, userId), eq(ptoConfig.year, data.year)))
    .limit(1);

  if (existing.length > 0) {
    const [config] = await db
      .update(ptoConfig)
      .set({ yearlyAllowance: data.yearlyAllowance })
      .where(eq(ptoConfig.id, existing[0].id))
      .returning();
    return config;
  }

  const [config] = await db
    .insert(ptoConfig)
    .values({
      userId,
      yearlyAllowance: data.yearlyAllowance,
      year: data.year,
    })
    .returning();
  return config;
}
