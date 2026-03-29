import { db } from '../../db';
import { sessions, pending2faTokens, otpCodes, stripeWebhookEvents } from '../../db/schema';
import { lt } from 'drizzle-orm';
import { logger } from '../../lib/logger';

const WEBHOOK_EVENT_RETENTION_DAYS = 7;

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

  const webhookCutoff = new Date(now.getTime() - WEBHOOK_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deletedWebhookEvents = await db
    .delete(stripeWebhookEvents)
    .where(lt(stripeWebhookEvents.processedAt, webhookCutoff))
    .returning({ id: stripeWebhookEvents.id });

  logger.info('Session cleanup complete', {
    deletedSessions: deletedSessions.length,
    deletedPending2faTokens: deletedTokens.length,
    deletedOtpCodes: deletedOtps.length,
    deletedWebhookEvents: deletedWebhookEvents.length,
  });
}
