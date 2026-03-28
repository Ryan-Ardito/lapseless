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

export async function changeRole(orgId: string, memberId: string, role: 'admin' | 'member') {
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

export async function removeMemberByUserId(orgId: string, userId: string) {
  const [member] = await db
    .delete(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)))
    .returning();
  return member;
}

export async function getMember(orgId: string, memberId: string) {
  const [member] = await db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)))
    .limit(1);
  return member;
}

export async function isMember(orgId: string, userId: string): Promise<boolean> {
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

export async function isMemberByEmail(orgId: string, email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(
      eq(organizationMembers.organizationId, orgId),
      eq(users.email, email.toLowerCase()),
    ))
    .limit(1);
  return !!row;
}
