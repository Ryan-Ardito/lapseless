import { db } from '../db';
import { obligations, documents, categoryEnum, recurrenceTypeEnum, reminderFrequencyEnum } from '../db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getNextDueDate, shiftDates } from '../lib/date-math';

type Category = (typeof categoryEnum.enumValues)[number];
type RecurrenceType = (typeof recurrenceTypeEnum.enumValues)[number];
type ReminderFrequency = (typeof reminderFrequencyEnum.enumValues)[number];
type ObligationInsert = typeof obligations.$inferInsert;

export async function listObligations(orgId: string, filters?: { category?: Category; completed?: boolean; userId?: string }) {
  const conditions = [eq(obligations.organizationId, orgId), isNull(obligations.deletedAt)];

  if (filters?.userId) {
    conditions.push(eq(obligations.userId, filters.userId));
  }
  if (filters?.category) {
    conditions.push(eq(obligations.category, filters.category));
  }
  if (filters?.completed !== undefined) {
    conditions.push(eq(obligations.completed, filters.completed));
  }

  return db
    .select()
    .from(obligations)
    .where(and(...conditions));
}

export async function createObligation(
  orgId: string,
  userId: string,
  data: {
    name: string;
    category: Category;
    dueDate: string;
    startDate?: string;
    referenceNumber?: string;
    notes?: string;
    links?: { label: string; url: string }[];
    recurrenceType?: RecurrenceType;
    recurrenceAutoRenew?: boolean;
    ceuRequired?: number;
    ceuCompleted?: number;
    notificationChannels?: string[];
    reminderDaysBefore?: number;
    reminderFrequency?: ReminderFrequency;
    reminderDates?: string[];
    reminderTime?: string | null;
  },
) {
  const [obligation] = await db
    .insert(obligations)
    .values({
      organizationId: orgId,
      userId,
      name: data.name,
      category: data.category,
      dueDate: data.dueDate,
      startDate: data.startDate,
      referenceNumber: data.referenceNumber,
      notes: data.notes ?? '',
      links: data.links,
      recurrenceType: data.recurrenceType,
      recurrenceAutoRenew: data.recurrenceAutoRenew ?? false,
      ceuRequired: data.ceuRequired,
      ceuCompleted: data.ceuCompleted,
      notificationChannels: data.notificationChannels ?? [],
      reminderDaysBefore: data.reminderDaysBefore ?? 7,
      reminderFrequency: data.reminderFrequency,
      reminderDates: data.reminderDates ?? [],
      reminderTime: data.reminderTime ?? null,
    })
    .returning();
  return obligation;
}

export async function updateObligation(orgId: string, id: string, updates: Partial<{
  name: string;
  category: Category;
  dueDate: string;
  startDate: string | null;
  referenceNumber: string | null;
  notes: string;
  links: { label: string; url: string }[] | null;
  recurrenceType: RecurrenceType | null;
  recurrenceAutoRenew: boolean;
  ceuRequired: number | null;
  ceuCompleted: number | null;
  notificationChannels: string[];
  reminderDaysBefore: number;
  reminderFrequency: ReminderFrequency | null;
  reminderDates: string[];
  reminderTime: string | null;
  completed: boolean;
  notificationsMuted: boolean;
}>) {
  const setValues: Partial<ObligationInsert> = { ...updates, updatedAt: new Date() };
  const [obligation] = await db
    .update(obligations)
    .set(setValues)
    .where(and(eq(obligations.id, id), eq(obligations.organizationId, orgId)))
    .returning();
  return obligation;
}

export async function getObligation(orgId: string, id: string) {
  const [obligation] = await db
    .select()
    .from(obligations)
    .where(and(eq(obligations.id, id), eq(obligations.organizationId, orgId)))
    .limit(1);
  return obligation;
}

export async function softDeleteObligation(orgId: string, id: string) {
  const [obligation] = await db
    .update(obligations)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(obligations.id, id), eq(obligations.organizationId, orgId)))
    .returning();
  return obligation;
}

export async function restoreObligation(orgId: string, id: string) {
  const [obligation] = await db
    .update(obligations)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(obligations.id, id), eq(obligations.organizationId, orgId)))
    .returning();
  return obligation;
}

export async function toggleComplete(orgId: string, id: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(obligations)
      .where(and(eq(obligations.id, id), eq(obligations.organizationId, orgId)))
      .limit(1)
      .for('update');

    if (!existing) return null;

    const newCompleted = !existing.completed;
    const [updated] = await tx
      .update(obligations)
      .set({ completed: newCompleted, completedAt: newCompleted ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(obligations.id, id), eq(obligations.organizationId, orgId)))
      .returning();

    let renewed = null;
    if (newCompleted && existing.recurrenceType && existing.recurrenceAutoRenew) {
      const nextDueDate = getNextDueDate(existing.dueDate, existing.recurrenceType);
      const oldDue = new Date(existing.dueDate + 'T00:00:00');
      const newDue = new Date(nextDueDate + 'T00:00:00');
      const daysDelta = Math.round((newDue.getTime() - oldDue.getTime()) / (1000 * 60 * 60 * 24));
      const shiftedDates = (existing.reminderDates as string[] ?? []).length > 0
        ? shiftDates(existing.reminderDates as string[], daysDelta)
        : [];
      [renewed] = await tx
        .insert(obligations)
        .values({
          organizationId: existing.organizationId,
          userId: existing.userId,
          name: existing.name,
          category: existing.category,
          dueDate: nextDueDate,
          startDate: existing.dueDate,
          referenceNumber: existing.referenceNumber,
          notes: existing.notes,
          links: existing.links,
          recurrenceType: existing.recurrenceType,
          recurrenceAutoRenew: existing.recurrenceAutoRenew,
          ceuRequired: existing.ceuRequired,
          ceuCompleted: existing.ceuRequired ? 0 : null,
          notificationChannels: existing.notificationChannels,
          reminderDaysBefore: existing.reminderDaysBefore,
          reminderFrequency: existing.reminderFrequency,
          reminderDates: shiftedDates,
          reminderTime: existing.reminderTime,
          notificationsMuted: existing.notificationsMuted,
        })
        .returning();
    }

    return { updated, renewed };
  });
}

export async function getDocumentsForObligations(orgId: string, obligationIds: string[]) {
  if (obligationIds.length === 0) return [];
  return db
    .select()
    .from(documents)
    .where(and(
      eq(documents.organizationId, orgId),
      isNull(documents.deletedAt),
      inArray(documents.obligationId, obligationIds),
    ));
}
