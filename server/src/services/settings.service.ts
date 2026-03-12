import { db } from '../db';
import { userSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

const DEFAULTS = {
  theme: 'system' as string,
  defaultReminder: { channels: ['email'] as string[], daysBefore: 7, frequency: 'once' as string },
};

export async function getSettings(userId: string) {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!row) {
    return { theme: DEFAULTS.theme, defaultReminder: DEFAULTS.defaultReminder };
  }

  return { theme: row.theme, defaultReminder: row.defaultReminder };
}

export async function upsertSettings(
  userId: string,
  updates: { theme?: string; defaultReminder?: { channels: string[]; daysBefore: number; frequency: string } },
) {
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    const [row] = await db
      .update(userSettings)
      .set({
        ...(updates.theme !== undefined && { theme: updates.theme }),
        ...(updates.defaultReminder !== undefined && { defaultReminder: updates.defaultReminder }),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();
    return { theme: row.theme, defaultReminder: row.defaultReminder };
  }

  const [row] = await db
    .insert(userSettings)
    .values({
      userId,
      theme: updates.theme ?? DEFAULTS.theme,
      defaultReminder: updates.defaultReminder ?? DEFAULTS.defaultReminder,
    })
    .returning();
  return { theme: row.theme, defaultReminder: row.defaultReminder };
}
