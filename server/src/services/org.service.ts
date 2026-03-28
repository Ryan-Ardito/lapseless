import { db } from '../db';
import { organizations, organizationMembers } from '../db/schema';
import { eq, and, isNull, isNotNull, gt } from 'drizzle-orm';
import { checkOrgLimit } from '../middleware/plan-enforcement';

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
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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

export async function createOrg(userId: string, name: string) {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name, ownerId: userId })
      .returning();

    await tx
      .insert(organizationMembers)
      .values({ organizationId: org.id, userId, role: 'owner' });

    return org;
  });
}

export async function updateOrg(orgId: string, updates: { name?: string }) {
  const [org] = await db
    .update(organizations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return org;
}

export async function deleteOrg(orgId: string) {
  const [org] = await db
    .update(organizations)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return org;
}

export async function restoreOrg(orgId: string) {
  const [org] = await db
    .update(organizations)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return org;
}

export async function hardDeleteOrg(orgId: string) {
  await db.delete(organizations).where(eq(organizations.id, orgId));
}

export async function getOrg(orgId: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org;
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

    await checkOrgLimit(newOwnerUserId, tx);

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
      .set({ role: 'admin' })
      .where(and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, org.ownerId),
      ));

    // Promote new owner
    await tx
      .update(organizationMembers)
      .set({ role: 'owner' })
      .where(and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, newOwnerUserId),
      ));

    return { orgId, newOwnerId: newOwnerUserId };
  });
}
