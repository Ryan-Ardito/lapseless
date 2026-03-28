import { db, type DbOrTx } from '../db';
import { invitations, organizationMembers, organizations, users } from '../db/schema';
import { eq, and, gt, lt, count, isNull, sql } from 'drizzle-orm';
import { hashSessionToken } from './auth.service';
import { checkMemberLimit } from '../middleware/plan-enforcement';
import { AppError } from '../middleware/error-handler';
import { INVITE_EXPIRY_MS } from '../lib/constants';

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createInvite(orgId: string, invitedByUserId: string, email: string, role: 'admin' | 'member', txOrDb: DbOrTx = db) {
  const rawToken = generateToken();
  const hashedToken = hashSessionToken(rawToken);
  const normalizedEmail = email.toLowerCase();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  // Check for existing pending invite (partial unique index: orgId + email WHERE status='pending')
  const [existing] = await txOrDb
    .select({ id: invitations.id, expiresAt: invitations.expiresAt })
    .from(invitations)
    .where(and(
      eq(invitations.organizationId, orgId),
      eq(invitations.email, normalizedEmail),
      eq(invitations.status, 'pending'),
    ))
    .limit(1)
    .for('update');

  if (existing) {
    if (existing.expiresAt > new Date()) {
      throw new AppError(409, 'An active invite already exists for this email');
    }
    // Expire the stale pending invite so the partial unique index allows a new insert
    await txOrDb
      .update(invitations)
      .set({ status: 'expired' })
      .where(eq(invitations.id, existing.id));
  }

  try {
    const [invite] = await txOrDb
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
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'An active invite already exists for this email');
    }
    throw err;
  }
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
      inviterName: sql<string>`coalesce(${users.name}, 'A former member')`,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .leftJoin(users, eq(users.id, invitations.invitedByUserId))
    .where(and(eq(invitations.token, hashedToken), isNull(organizations.deletedAt)))
    .limit(1);
  return invite;
}

export async function acceptInvite(rawToken: string, userId: string, email: string) {
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
        eq(invitations.email, email.toLowerCase()),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
        isNull(organizations.deletedAt),
      ))
      .limit(1)
      .for('update');

    if (!invite) return null;

    await checkMemberLimit(invite.organizationId, tx, invite.id);

    await tx
      .insert(organizationMembers)
      .values({ organizationId: invite.organizationId, userId, role: invite.role })
      .onConflictDoNothing();

    const [updated] = await tx
      .update(invitations)
      .set({ status: 'accepted', acceptedAt: new Date(), acceptedByUserId: userId })
      .where(and(eq(invitations.id, invite.id), eq(invitations.status, 'pending')))
      .returning({ id: invitations.id });

    if (!updated) return null;

    return invite;
  });
}

export async function listPendingInvitesForUser(email: string) {
  return db
    .select({
      id: invitations.id,
      organizationId: invitations.organizationId,
      orgName: organizations.name,
      inviterName: sql<string>`coalesce(${users.name}, 'A former member')`,
      role: invitations.role,
      email: invitations.email,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
    .leftJoin(users, eq(users.id, invitations.invitedByUserId))
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
      .limit(1)
      .for('update');

    if (!invite) return null;

    await checkMemberLimit(invite.organizationId, tx, invite.id);

    await tx
      .insert(organizationMembers)
      .values({ organizationId: invite.organizationId, userId, role: invite.role })
      .onConflictDoNothing();

    const [updated] = await tx
      .update(invitations)
      .set({ status: 'accepted', acceptedAt: new Date(), acceptedByUserId: userId })
      .where(and(eq(invitations.id, invite.id), eq(invitations.status, 'pending')))
      .returning({ id: invitations.id });

    if (!updated) return null;

    return invite;
  });
}

export async function getPendingInviteForUser(inviteId: string, email: string) {
  const [invite] = await db
    .select({
      id: invitations.id,
      organizationId: invitations.organizationId,
      orgName: organizations.name,
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
  return invite;
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

export async function expireStaleInvites(txOrDb: DbOrTx = db) {
  return txOrDb
    .update(invitations)
    .set({ status: 'expired' })
    .where(and(eq(invitations.status, 'pending'), lt(invitations.expiresAt, new Date())))
    .returning({ id: invitations.id });
}
