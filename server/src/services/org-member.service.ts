import { db } from '../db';
import { organizationMembers, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function listMembers(orgId: string) {
  return db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, orgId));
}

export async function changeRole(orgId: string, memberId: string, role: 'admin' | 'member' | 'viewer') {
  const [member] = await db
    .update(organizationMembers)
    .set({ role })
    .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
    .returning();
  return member;
}

export async function removeMember(orgId: string, memberId: string) {
  const [member] = await db
    .delete(organizationMembers)
    .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
    .returning();
  return member;
}
