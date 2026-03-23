import { db } from '../../db';
import { sessions, pending2faTokens, otpCodes } from '../../db/schema';
import { lt } from 'drizzle-orm';
import { logger } from '../../lib/logger';

export async function processSessionCleanup() {
  const now = new Date();

  const deletedSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  const deletedTokens = await db
    .delete(pending2faTokens)
    .where(lt(pending2faTokens.expiresAt, now))
    .returning({ id: pending2faTokens.id });

  const deletedOtps = await db
    .delete(otpCodes)
    .where(lt(otpCodes.expiresAt, now))
    .returning({ id: otpCodes.id });

  logger.info('Session cleanup complete', {
    deletedSessions: deletedSessions.length,
    deletedPending2faTokens: deletedTokens.length,
    deletedOtpCodes: deletedOtps.length,
  });
}
