import type { Job } from 'bullmq';
import { db } from '../../db';
import { documents } from '../../db/schema';
import { lt, isNotNull, and, inArray } from 'drizzle-orm';
import { deleteS3Object } from '../../lib/s3';
import { logger } from '../../lib/logger';

const BATCH_SIZE = 50;
const RETENTION_DAYS = 7;

export async function processS3Cleanup(_job: Job) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  let totalDeleted = 0;

  // Process in batches
  while (true) {
    const batch = await db
      .select({ id: documents.id, s3Key: documents.s3Key })
      .from(documents)
      .where(and(isNotNull(documents.deletedAt), lt(documents.deletedAt, cutoff)))
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    for (const doc of batch) {
      try {
        await deleteS3Object(doc.s3Key);
      } catch (err) {
        logger.error('Failed to delete S3 object', { s3Key: doc.s3Key, error: String(err) });
      }
    }

    // Hard-delete the batch from DB
    const ids = batch.map((d) => d.id);
    await db.delete(documents).where(inArray(documents.id, ids));

    totalDeleted += batch.length;
  }

  logger.info('S3 cleanup complete', { deleted: totalDeleted });
}
