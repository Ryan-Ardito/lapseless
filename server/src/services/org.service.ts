import { db } from '../db';
import { organizations, organizationMembers } from '../db/schema';
import { eq, and, count } from 'drizzle-orm';

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
    .where(eq(organizationMembers.userId, userId));
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
