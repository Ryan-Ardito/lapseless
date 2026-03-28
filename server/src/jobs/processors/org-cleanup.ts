import { db } from '../../db';
import { organizations, documents, invitations } from '../../db/schema';
import { lt, isNotNull, and, eq, inArray } from 'drizzle-orm';
import { deleteS3Object } from '../../lib/s3';
import { logger } from '../../lib/logger';

const RETENTION_DAYS = 30;
const BATCH_SIZE = 50;

/**
 * Hard-deletes organizations that were soft-deleted more than 30 days ago.
 * Cleans up S3 objects for all documents in those orgs before removing the DB rows.
 * Cascade delete on the organizations table handles child rows (members, invites, docs, etc.)
 */
export async function processOrgCleanup() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  // Find orgs past the 30-day recovery window
  const expiredOrgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(isNotNull(organizations.deletedAt), lt(organizations.deletedAt, cutoff)));

  if (expiredOrgs.length === 0) return;

  for (const org of expiredOrgs) {
    // Delete S3 objects in batches
    let totalS3Deleted = 0;
    while (true) {
      const batch = await db
        .select({ id: documents.id, s3Key: documents.s3Key })
        .from(documents)
        .where(eq(documents.organizationId, org.id))
        .limit(BATCH_SIZE);

      if (batch.length === 0) break;

      for (const doc of batch) {
        try {
          await deleteS3Object(doc.s3Key);
        } catch (err) {
          logger.error('Failed to delete S3 object during org cleanup', {
            orgId: org.id,
            s3Key: doc.s3Key,
            error: String(err),
          });
        }
      }

      // Remove document rows (even if S3 delete failed — they'll be orphaned but DB is clean)
      const ids = batch.map((d) => d.id);
      await db.delete(documents).where(inArray(documents.id, ids));
      totalS3Deleted += batch.length;
    }

    // Hard-delete the org — cascade handles members, invites, obligations, etc.
    await db.delete(organizations).where(eq(organizations.id, org.id));

    logger.info('Hard-deleted expired organization', {
      orgId: org.id,
      s3ObjectsDeleted: totalS3Deleted,
    });
  }

  // Mark expired pending invites
  const expiredInvites = await db
    .update(invitations)
    .set({ status: 'expired' })
    .where(and(eq(invitations.status, 'pending'), lt(invitations.expiresAt, new Date())))
    .returning({ id: invitations.id });

  if (expiredInvites.length > 0) {
    logger.info('Marked expired invitations', { count: expiredInvites.length });
  }
}
