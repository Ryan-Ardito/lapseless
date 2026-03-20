import type { MiddlewareHandler } from 'hono';
import { db } from '../db';
import { sessions, users } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { hashSessionToken } from '../services/auth.service';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  jobTitle: string;
  timezone: string;
  avatarUrl: string | null;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    requestId: string;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const sessionId = getCookie(c, 'session');
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const hashedId = hashSessionToken(sessionId);
  const now = new Date();
  const result = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      jobTitle: users.jobTitle,
      timezone: users.timezone,
      avatarUrl: users.avatarUrl,
      phoneVerified: users.phoneVerified,
      twoFactorEnabled: users.twoFactorEnabled,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashedId), gt(sessions.expiresAt, now)))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const row = result[0];

  // Sliding window: extend session if within 15 days of expiry
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  if (row.expiresAt.getTime() - now.getTime() < fifteenDays) {
    const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, hashedId));
  }

  c.set('user', {
    id: row.userId,
    email: row.email,
    name: row.name,
    phone: row.phone,
    jobTitle: row.jobTitle,
    timezone: row.timezone,
    avatarUrl: row.avatarUrl,
    phoneVerified: row.phoneVerified,
    twoFactorEnabled: row.twoFactorEnabled,
  });

  await next();
};
