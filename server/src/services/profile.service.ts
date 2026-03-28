import { db } from '../db';
import { users, documents, subscriptions, organizations, organizationMembers } from '../db/schema';
import { eq, inArray, and, ne, isNull } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler';
import { stripe } from '../lib/stripe';
import { deleteS3Objects } from '../lib/s3';
import { logger } from '../lib/logger';

export async function getProfile(userId: string) {
  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      jobTitle: users.jobTitle,
      timezone: users.timezone,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user;
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; phone?: string; jobTitle?: string; timezone?: string },
) {
  let extraFields: Record<string, any> = {};

  if (updates.phone !== undefined) {
    const [current] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (current && updates.phone !== current.phone) {
      extraFields = { phoneVerified: false, twoFactorEnabled: false };
    }
  }

  const [user] = await db
    .update(users)
    .set({ ...updates, ...extraFields, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      name: users.name,
      email: users.email,
      phone: users.phone,
      jobTitle: users.jobTitle,
      timezone: users.timezone,
      avatarUrl: users.avatarUrl,
    });
  return user;
}

export async function deleteAccount(userId: string): Promise<void> {
  // Block deletion if user owns orgs with other members — require ownership transfer first
  const ownedOrgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.ownerId, userId), isNull(organizations.deletedAt)));
  const ownedOrgIds = ownedOrgs.map(o => o.id);

  if (ownedOrgIds.length > 0) {
    const [otherMember] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(and(
        inArray(organizationMembers.organizationId, ownedOrgIds),
        ne(organizationMembers.userId, userId),
      ))
      .limit(1);

    if (otherMember) {
      throw new AppError(400, 'Transfer ownership of all organizations before deleting your account');
    }
  }

  const docs = ownedOrgIds.length > 0
    ? await db
        .select({ s3Key: documents.s3Key })
        .from(documents)
        .where(inArray(documents.organizationId, ownedOrgIds))
    : await db
        .select({ s3Key: documents.s3Key })
        .from(documents)
        .where(eq(documents.userId, userId));

  const s3Keys = docs.map(d => d.s3Key);

  // 2. Delete S3 objects
  if (s3Keys.length > 0) {
    try {
      await deleteS3Objects(s3Keys);
    } catch (err) {
      logger.error('Failed to delete S3 objects during account deletion', {
        userId,
        keyCount: s3Keys.length,
        error: String(err),
      });
    }
  }

  // 3. Delete Stripe customer if exists
  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (sub?.stripeCustomerId && stripe) {
    try {
      await stripe.customers.del(sub.stripeCustomerId);
    } catch (err) {
      logger.error('Failed to delete Stripe customer during account deletion', {
        userId,
        stripeCustomerId: sub.stripeCustomerId,
        error: String(err),
      });
    }
  }

  // 4. Delete user row — cascade handles all 12 child tables
  await db.delete(users).where(eq(users.id, userId));
}
