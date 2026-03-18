import type { MiddlewareHandler } from 'hono';
import { db } from '../db';
import { subscriptions, obligations, documents } from '../db/schema';
import { eq, isNull, count, sum } from 'drizzle-orm';
import { and } from 'drizzle-orm';
import { PLAN_LIMITS, type Tier } from '../lib/plan-limits';
import { AppError } from './error-handler';

async function getUserTier(userId: string): Promise<Tier> {
  const result = await db
    .select({ tier: subscriptions.tier })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return (result[0]?.tier as Tier) ?? 'solo';
}

export async function checkObligationLimit(userId: string) {
  const tier = await getUserTier(userId);
  const limits = PLAN_LIMITS[tier];

  const [{ value }] = await db
    .select({ value: count() })
    .from(obligations)
    .where(and(eq(obligations.userId, userId), isNull(obligations.deletedAt)));

  if (limits.obligations === null) return; // unlimited
  if (value >= limits.obligations) {
    throw new AppError(403, `Plan limit reached: ${limits.obligations} obligations on ${tier} tier`);
  }
}

export async function checkStorageLimit(userId: string, additionalBytes: number) {
  const tier = await getUserTier(userId);
  const limits = PLAN_LIMITS[tier];
  const maxBytes = limits.storageMB * 1024 * 1024;

  const [{ value }] = await db
    .select({ value: sum(documents.size) })
    .from(documents)
    .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)));

  const currentBytes = Number(value ?? 0);
  if (currentBytes + additionalBytes > maxBytes) {
    throw new AppError(403, `Storage limit reached: ${limits.storageMB}MB on ${tier} tier`);
  }
}

export async function checkSmsLimit(userId: string) {
  const tier = await getUserTier(userId);
  const limits = PLAN_LIMITS[tier];

  const result = await db
    .select({ smsUsed: subscriptions.smsUsedThisMonth })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const used = result[0]?.smsUsed ?? 0;
  if (used >= limits.smsPerMonth) {
    throw new AppError(403, `SMS limit reached: ${limits.smsPerMonth}/month on ${tier} tier`);
  }
}
