import { db, type DbOrTx } from '../db';
import { organizations, organizationMembers, invitations } from '../db/schema';
import { eq, and, isNull, isNotNull, gt } from 'drizzle-orm';
import { checkOrgLimit, checkTransferCompatibility } from '../middleware/plan-enforcement';
import { ORG_RECOVERY_WINDOW_MS } from '../lib/constants';

export async function listUserOrgs(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      ownerId: organizations.ownerId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), isNull(organizations.deletedAt)))
    .orderBy(organizationMembers.joinedAt);
}

export async function listDeletedOrgs(userId: string) {
  const cutoff = new Date(Date.now() - ORG_RECOVERY_WINDOW_MS);
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      deletedAt: organizations.deletedAt,
    })
    .from(organizations)
    .where(and(
      eq(organizations.ownerId, userId),
      isNotNull(organizations.deletedAt),
      gt(organizations.deletedAt, cutoff),
    ));
}

export async function createOrg(userId: string, name: string, txOrDb: DbOrTx = db) {
  const run = async (tx: DbOrTx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name, ownerId: userId })
      .returning();

    await tx
      .insert(organizationMembers)
      .values({ organizationId: org.id, userId, role: 'owner' });

    return org;
  };

  // If already inside a transaction, use it directly; otherwise create one
  if (txOrDb !== db) return run(txOrDb);
  return db.transaction(run);
}

export async function updateOrg(orgId: string, updates: { name?: string; defaultPtoAllowance?: number }) {
  const [org] = await db
    .update(organizations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return org;
}

export async function deleteOrg(orgId: string) {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .update(organizations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(organizations.id, orgId))
      .returning();

    // Revoke all pending invites for this org
    await tx
      .update(invitations)
      .set({ status: 'revoked' })
      .where(and(
        eq(invitations.organizationId, orgId),
        eq(invitations.status, 'pending'),
      ));

    return org;
  });
}

export async function restoreOrg(orgId: string, txOrDb: DbOrTx = db) {
  const [org] = await txOrDb
    .update(organizations)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return org;
}

export async function getOrg(orgId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org;
}

export async function isOrgMember(orgId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.userId, userId),
    ))
    .limit(1);
  return !!row;
}

export async function transferOwnership(orgId: string, newOwnerUserId: string) {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .select({ ownerId: organizations.ownerId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
      .for('update');
    if (!org) return null;

    // Self-transfer is a no-op
    if (org.ownerId === newOwnerUserId) {
      return { orgId, newOwnerId: newOwnerUserId };
    }

    await checkOrgLimit(newOwnerUserId, tx);
    await checkTransferCompatibility(orgId, newOwnerUserId, tx);

    // Verify new owner is an existing member
    const [newOwnerMember] = await tx
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, newOwnerUserId),
      ))
      .limit(1);
    if (!newOwnerMember) return null;

    // Update org owner
    await tx
      .update(organizations)
      .set({ ownerId: newOwnerUserId, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));

    // Demote old owner to admin
    await tx
      .update(organizationMembers)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, org.ownerId),
      ));

    // Promote new owner
    await tx
      .update(organizationMembers)
      .set({ role: 'owner', updatedAt: new Date() })
      .where(and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, newOwnerUserId),
      ));

    return { orgId, newOwnerId: newOwnerUserId };
  });
}
