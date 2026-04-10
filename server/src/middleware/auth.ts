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

export type OrgRole = 'owner' | 'admin' | 'member';

export interface OrgContext {
  id: string;
  name: string;
  ownerId: string;
  defaultPtoAllowance: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    requestId: string;
    org: OrgContext;
    orgRole: OrgRole;
  }
}

async function resolveSession(c: Parameters<MiddlewareHandler>[0]): Promise<AuthUser | null> {
  const sessionId = getCookie(c, 'session');
  if (!sessionId) return null;

  const hashedId = hashSessionToken(sessionId);
  const now = new Date();
  const result = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
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

  if (result.length === 0) return null;

  const row = result[0];

  // Hard max lifetime: 90 days from creation
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  if (row.createdAt && now.getTime() - row.createdAt.getTime() > ninetyDays) {
    await db.delete(sessions).where(eq(sessions.id, hashedId));
    return null;
  }

  // Sliding window: extend session if within 15 days of expiry (capped at 90-day max)
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  if (row.expiresAt.getTime() - now.getTime() < fifteenDays) {
    const maxExpiry = row.createdAt
      ? new Date(row.createdAt.getTime() + ninetyDays)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const slidingExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const newExpiry = slidingExpiry < maxExpiry ? slidingExpiry : maxExpiry;
    await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, hashedId));
  }

  return {
    id: row.userId,
    email: row.email,
    name: row.name,
    phone: row.phone,
    jobTitle: row.jobTitle,
    timezone: row.timezone,
    avatarUrl: row.avatarUrl,
    phoneVerified: row.phoneVerified,
    twoFactorEnabled: row.twoFactorEnabled,
  };
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const user = await resolveSession(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  c.set('user', user);
  await next();
};

export const optionalAuthMiddleware: MiddlewareHandler = async (c, next) => {
  const user = await resolveSession(c);
  if (user) c.set('user', user);
  await next();
};
