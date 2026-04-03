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
  updates: { name?: string; jobTitle?: string; timezone?: string },
) {
  const [user] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      name: users.name,
      email: users.email,
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

  // Collect external resource IDs before cascade-deleting the user
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

  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const stripeCustomerId = sub?.stripeCustomerId;

  // 2. Delete user row first — cascade handles all child tables.
  // This ensures the user can never be left in a half-deleted state
  // (e.g., files gone but account still active).
  await db.delete(users).where(eq(users.id, userId));

  // 3. Clean up external resources. Failures are logged for manual cleanup
  // but don't affect the user since their account is already gone.
  if (s3Keys.length > 0) {
    try {
      await deleteS3Objects(s3Keys);
    } catch (err) {
      logger.error('Orphaned S3 objects after account deletion — manual cleanup needed', {
        userId,
        keyCount: s3Keys.length,
        keys: s3Keys.slice(0, 10),
        error: String(err),
      });
    }
  }

  if (stripeCustomerId && stripe) {
    try {
      await stripe.customers.del(stripeCustomerId);
    } catch (err) {
      logger.error('Orphaned Stripe customer after account deletion — manual cleanup needed', {
        userId,
        stripeCustomerId,
        error: String(err),
      });
    }
  }
}
