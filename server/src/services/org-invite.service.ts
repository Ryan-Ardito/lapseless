import { db } from '../db';
import { invitations, organizationMembers, organizations, users } from '../db/schema';
import { eq, and, gt, count } from 'drizzle-orm';
import { hashSessionToken } from './auth.service';

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createInvite(orgId: string, invitedByUserId: string, email: string, role: 'admin' | 'member' | 'viewer') {
  const rawToken = generateToken();
  const hashedToken = hashSessionToken(rawToken);

  const [invite] = await db
    .insert(invitations)
    .values({
      organizationId: orgId,
      invitedByUserId,
      email: email.toLowerCase(),
      role,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })
    .returning();

  return { ...invite, rawToken };
}

export async function listPendingInvites(orgId: string) {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(and(
      eq(invitations.organizationId, orgId),
      eq(invitations.status, 'pending'),
      gt(invitations.expiresAt, new Date()),
    ));
}

export async function revokeInvite(orgId: string, inviteId: string) {
  const [invite] = await db
    .update(invitations)
    .set({ status: 'revoked' })
    .where(and(
      eq(invitations.id, inviteId),
      eq(invitations.organizationId, orgId),
      eq(invitations.status, 'pending'),
    ))
    .returning();
  return invite;
}

export async function getInviteByToken(rawToken: string) {
  const hashedToken = hashSessionToken(rawToken);
  const [invite] = await db
    .select({
      id: invitations.id,
      organizationId: invitations.organizationId,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      orgName: organizations.name,
      inviterName: users.name,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .innerJoin(users, eq(users.id, invitations.invitedByUserId))
    .where(eq(invitations.token, hashedToken))
    .limit(1);
  return invite;
}

export async function acceptInvite(rawToken: string, userId: string) {
  const hashedToken = hashSessionToken(rawToken);

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(invitations)
      .where(and(
        eq(invitations.token, hashedToken),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
      ))
      .limit(1);

    if (!invite) return null;

    await tx
      .insert(organizationMembers)
      .values({ organizationId: invite.organizationId, userId, role: invite.role })
      .onConflictDoNothing();

    await tx
      .update(invitations)
      .set({ status: 'accepted', acceptedAt: new Date(), acceptedByUserId: userId })
      .where(eq(invitations.id, invite.id));

    return invite;
  });
}

export async function countPendingInvitesForUser(email: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(invitations)
    .where(and(
      eq(invitations.email, email.toLowerCase()),
      eq(invitations.status, 'pending'),
      gt(invitations.expiresAt, new Date()),
    ));
  return Number(value);
}
