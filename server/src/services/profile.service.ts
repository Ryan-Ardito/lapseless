import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function getProfile(userId: string) {
  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      jobTitle: users.jobTitle,
      timezone: users.timezone,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user;
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; phone?: string; jobTitle?: string; timezone?: string },
) {
  let extraFields: Record<string, any> = {};

  if (updates.phone !== undefined) {
    const [current] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (current && updates.phone !== current.phone) {
      extraFields = { phoneVerified: false, twoFactorEnabled: false };
    }
  }

  const [user] = await db
    .update(users)
    .set({ ...updates, ...extraFields, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      name: users.name,
      email: users.email,
      phone: users.phone,
      jobTitle: users.jobTitle,
      timezone: users.timezone,
      avatarUrl: users.avatarUrl,
    });
  return user;
}
