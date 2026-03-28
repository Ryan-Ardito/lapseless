import { db, type DbOrTx } from '../db';
import { subscriptions, obligations, documents, organizations, organizationMembers, invitations } from '../db/schema';
import { eq, isNull, count, sum, inArray, and, gt, ne } from 'drizzle-orm';
import { PLAN_LIMITS, type Tier } from '../lib/plan-limits';
import { AppError } from './error-handler';

interface OwnerPlanContext {
  ownerId: string;
  tier: Tier;
  orgIds: string[];
  smsUsedThisMonth: number;
}

async function getOwnerPlanContext(orgId: string, txOrDb: DbOrTx = db): Promise<OwnerPlanContext> {
  // Single query: JOIN organizations → subscriptions to get tier + ownerId + smsUsedThisMonth
  const result = await txOrDb
    .select({
      ownerId: organizations.ownerId,
      tier: subscriptions.tier,
      smsUsedThisMonth: subscriptions.smsUsedThisMonth,
    })
    .from(organizations)
    .innerJoin(subscriptions, eq(subscriptions.userId, organizations.ownerId))
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!result[0]) {
    return { ownerId: '', tier: 'demo', orgIds: [], smsUsedThisMonth: 0 };
  }

  const { ownerId, tier, smsUsedThisMonth } = result[0];

  // Second query: all active (non-deleted) org IDs for that owner
  const rows = await txOrDb
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.ownerId, ownerId), isNull(organizations.deletedAt)));

  return {
    ownerId,
    tier: (tier as Tier) ?? 'demo',
    orgIds: rows.map((r) => r.id),
    smsUsedThisMonth: smsUsedThisMonth ?? 0,
  };
}

export async function checkObligationLimit(orgId: string) {
  const { tier, orgIds } = await getOwnerPlanContext(orgId);
  const limits = PLAN_LIMITS[tier];
  if (limits.obligations === null) return; // unlimited
  if (orgIds.length === 0) return;

  const [{ value }] = await db
    .select({ value: count() })
    .from(obligations)
    .where(and(inArray(obligations.organizationId, orgIds), isNull(obligations.deletedAt)));

  if (value >= limits.obligations) {
    throw new AppError(403, `Plan limit reached: ${limits.obligations} obligations on ${tier} tier`);
  }
}

export async function checkStorageLimit(orgId: string, additionalBytes: number) {
  const { tier, orgIds } = await getOwnerPlanContext(orgId);
  const limits = PLAN_LIMITS[tier];
  const maxBytes = limits.storageMB * 1024 * 1024;
  if (orgIds.length === 0) return;

  const [{ value }] = await db
    .select({ value: sum(documents.size) })
    .from(documents)
    .where(and(inArray(documents.organizationId, orgIds), isNull(documents.deletedAt)));

  const currentBytes = Number(value ?? 0);
  if (currentBytes + additionalBytes > maxBytes) {
    throw new AppError(403, `Storage limit reached: ${limits.storageMB}MB on ${tier} tier`);
  }
}

export async function checkSmsLimit(orgId: string) {
  const { tier, smsUsedThisMonth } = await getOwnerPlanContext(orgId);
  const limits = PLAN_LIMITS[tier];

  if (smsUsedThisMonth >= limits.smsPerMonth) {
    throw new AppError(403, `SMS limit reached: ${limits.smsPerMonth}/month on ${tier} tier`);
  }
}

export async function checkMemberLimit(orgId: string, txOrDb: DbOrTx = db, excludeInviteId?: string) {
  const { tier } = await getOwnerPlanContext(orgId, txOrDb);
  const limits = PLAN_LIMITS[tier];

  const pendingConditions = [
    eq(invitations.organizationId, orgId),
    eq(invitations.status, 'pending'),
    gt(invitations.expiresAt, new Date()),
    ...(excludeInviteId ? [ne(invitations.id, excludeInviteId)] : []),
  ];

  const [[{ value: memberCount }], [{ value: pendingCount }]] = await Promise.all([
    txOrDb.select({ value: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId)),
    txOrDb.select({ value: count() })
      .from(invitations)
      .where(and(...pendingConditions)),
  ]);

  if (Number(memberCount) + Number(pendingCount) >= limits.seatsPerOrg) {
    throw new AppError(403, `Member limit reached: ${limits.seatsPerOrg} seats on ${tier} tier`);
  }
}

export async function checkOrgLimit(userId: string, txOrDb: DbOrTx = db) {
  const sub = await txOrDb
    .select({ tier: subscriptions.tier })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const tier = (sub[0]?.tier as Tier) ?? 'demo';
  const limits = PLAN_LIMITS[tier];

  const [{ value }] = await txOrDb
    .select({ value: count() })
    .from(organizations)
    .where(and(eq(organizations.ownerId, userId), isNull(organizations.deletedAt)));

  if (value >= limits.maxOrgs) {
    throw new AppError(403, `Organization limit reached: ${limits.maxOrgs} orgs on ${tier} tier`);
  }
}

export async function checkTransferCompatibility(orgId: string, newOwnerUserId: string, txOrDb: DbOrTx = db) {
  // Get the new owner's tier
  const sub = await txOrDb
    .select({ tier: subscriptions.tier })
    .from(subscriptions)
    .where(eq(subscriptions.userId, newOwnerUserId))
    .limit(1);

  const tier = (sub[0]?.tier as Tier) ?? 'demo';
  const limits = PLAN_LIMITS[tier];

  // Check seats for this org against new owner's tier
  const [[{ value: memberCount }], [{ value: pendingCount }]] = await Promise.all([
    txOrDb.select({ value: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId)),
    txOrDb.select({ value: count() })
      .from(invitations)
      .where(and(
        eq(invitations.organizationId, orgId),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
      )),
  ]);

  const totalSeats = Number(memberCount) + Number(pendingCount);
  if (totalSeats > limits.seatsPerOrg) {
    throw new AppError(403,
      `Cannot transfer: this organization has ${totalSeats} seats but the target owner's ${tier} plan allows ${limits.seatsPerOrg}`
    );
  }

  // Get all active org IDs the new owner currently owns + this org
  const ownedRows = await txOrDb
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.ownerId, newOwnerUserId), isNull(organizations.deletedAt)));

  const ownedOrgIds = ownedRows.map((r) => r.id);
  const allOrgIds = ownedOrgIds.includes(orgId) ? ownedOrgIds : [...ownedOrgIds, orgId];

  // Check obligations across all orgs the new owner would own
  if (limits.obligations !== null && allOrgIds.length > 0) {
    const [{ value: obligationCount }] = await txOrDb
      .select({ value: count() })
      .from(obligations)
      .where(and(inArray(obligations.organizationId, allOrgIds), isNull(obligations.deletedAt)));

    if (Number(obligationCount) > limits.obligations) {
      throw new AppError(403,
        `Cannot transfer: combined obligation count (${obligationCount}) exceeds the target owner's ${tier} plan limit of ${limits.obligations}`
      );
    }
  }

  // Check storage across all orgs the new owner would own
  if (allOrgIds.length > 0) {
    const [{ value: totalBytes }] = await txOrDb
      .select({ value: sum(documents.size) })
      .from(documents)
      .where(and(inArray(documents.organizationId, allOrgIds), isNull(documents.deletedAt)));

    const maxBytes = limits.storageMB * 1024 * 1024;
    if (Number(totalBytes ?? 0) > maxBytes) {
      throw new AppError(403,
        `Cannot transfer: combined storage exceeds the target owner's ${tier} plan limit of ${limits.storageMB}MB`
      );
    }
  }
}
