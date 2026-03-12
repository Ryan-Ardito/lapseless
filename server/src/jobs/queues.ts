import { Queue } from 'bullmq';
import { bullmqConnection } from '../lib/redis';
import { logger } from '../lib/logger';

export const notificationSchedulerQueue = new Queue('notification-scheduler', { connection: bullmqConnection });
export const smsSenderQueue = new Queue('sms-sender', { connection: bullmqConnection });
export const emailSenderQueue = new Queue('email-sender', { connection: bullmqConnection });
export const sessionCleanupQueue = new Queue('session-cleanup', { connection: bullmqConnection });
export const s3CleanupQueue = new Queue('s3-cleanup', { connection: bullmqConnection });

export async function setupRecurringJobs() {
  // Remove existing repeatable jobs to avoid duplicates
  for (const queue of [notificationSchedulerQueue, sessionCleanupQueue, s3CleanupQueue]) {
    const existing = await queue.getRepeatableJobs();
    for (const job of existing) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Notification check every 15 minutes
  await notificationSchedulerQueue.add(
    'check-notifications',
    {},
    { repeat: { every: 15 * 60 * 1000 } },
  );

  // Session cleanup every hour
  await sessionCleanupQueue.add(
    'cleanup-sessions',
    {},
    { repeat: { every: 60 * 60 * 1000 } },
  );

  // S3 cleanup daily (every 24 hours)
  await s3CleanupQueue.add(
    'cleanup-s3',
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 } },
  );

  logger.info('Recurring jobs configured', {
    notifications: 'every 15m',
    sessionCleanup: 'every 1h',
    s3Cleanup: 'every 24h',
  });
}
