import { createHash } from 'crypto';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import { eq, and, ne } from 'drizzle-orm';

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function upsertUserFromGoogle(profile: GoogleProfile) {
  const [user] = await db
    .insert(users)
    .values({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture ?? null,
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const hashedToken = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    id: hashedToken,
    userId,
    expiresAt,
  });

  // Return the raw token for the cookie — only the hash is stored in DB
  return { token, expiresAt };
}

export async function deleteSession(sessionId: string) {
  const hashed = hashSessionToken(sessionId);
  await db.delete(sessions).where(eq(sessions.id, hashed));
}

export async function deleteAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function deleteOtherSessions(userId: string, currentSessionToken: string) {
  const currentHash = hashSessionToken(currentSessionToken);
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentHash)));
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
