import { db } from '../db';
import { invitations, organizationMembers, organizations, users } from '../db/schema';
import { eq, and, gt, count, isNull } from 'drizzle-orm';
import { hashSessionToken } from './auth.service';
import { AppError } from '../middleware/error-handler';

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createInvite(orgId: string, invitedByUserId: string, email: string, role: 'admin' | 'member') {
  const rawToken = generateToken();
  const hashedToken = hashSessionToken(rawToken);
  const normalizedEmail = email.toLowerCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Check for existing invite (unique constraint: orgId + email)
  const [existing] = await db
    .select({ id: invitations.id, status: invitations.status, expiresAt: invitations.expiresAt })
    .from(invitations)
    .where(and(
      eq(invitations.organizationId, orgId),
      eq(invitations.email, normalizedEmail),
    ))
    .limit(1);

  if (existing) {
    if (existing.status === 'pending' && existing.expiresAt > new Date()) {
      throw new AppError(409, 'An active invite already exists for this email');
    }
    // Re-invite: reset the expired/revoked row with a new token
    const [invite] = await db
      .update(invitations)
      .set({
        invitedByUserId,
        role,
        token: hashedToken,
        status: 'pending',
        expiresAt,
        acceptedAt: null,
        acceptedByUserId: null,
      })
      .where(eq(invitations.id, existing.id))
      .returning();
    return { ...invite, rawToken };
  }

  const [invite] = await db
    .insert(invitations)
    .values({
      organizationId: orgId,
      invitedByUserId,
      email: normalizedEmail,
      role,
      token: hashedToken,
      expiresAt,
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
    .where(and(eq(invitations.token, hashedToken), isNull(organizations.deletedAt)))
    .limit(1);
  return invite;
}

export async function acceptInvite(rawToken: string, userId: string) {
  const hashedToken = hashSessionToken(rawToken);

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: invitations.id,
        organizationId: invitations.organizationId,
        role: invitations.role,
      })
      .from(invitations)
      .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
      .where(and(
        eq(invitations.token, hashedToken),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
        isNull(organizations.deletedAt),
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

export async function listPendingInvitesForUser(email: string) {
  return db
    .select({
      id: invitations.id,
      organizationId: invitations.organizationId,
      orgName: organizations.name,
      inviterName: users.name,
      role: invitations.role,
      email: invitations.email,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .innerJoin(users, eq(users.id, invitations.invitedByUserId))
    .where(and(
      eq(invitations.email, email.toLowerCase()),
      eq(invitations.status, 'pending'),
      gt(invitations.expiresAt, new Date()),
      isNull(organizations.deletedAt),
    ));
}

export async function acceptInviteById(inviteId: string, userId: string, email: string) {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: invitations.id,
        organizationId: invitations.organizationId,
        role: invitations.role,
        email: invitations.email,
      })
      .from(invitations)
      .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
      .where(and(
        eq(invitations.id, inviteId),
        eq(invitations.email, email.toLowerCase()),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
        isNull(organizations.deletedAt),
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
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .where(and(
      eq(invitations.email, email.toLowerCase()),
      eq(invitations.status, 'pending'),
      gt(invitations.expiresAt, new Date()),
      isNull(organizations.deletedAt),
    ));
  return Number(value);
}
