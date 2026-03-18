import { db } from '../../db';
import { sessions } from '../../db/schema';
import { lt } from 'drizzle-orm';
import { logger } from '../../lib/logger';

export async function processSessionCleanup() {
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  logger.info('Session cleanup complete', { deleted: result.length });
}
