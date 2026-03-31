import { processNotificationScheduler } from './processors/notification-scheduler';
import { processDelivery } from './processors/delivery';
import { processEmailDelivery } from './processors/email-delivery';
import { processSessionCleanup } from './processors/session-cleanup';
import { processS3Cleanup } from './processors/s3-cleanup';
import { processOrgCleanup } from './processors/org-cleanup';
import { registerProcessor } from './trigger';
import { pruneRateLimitMaps } from '../middleware/rate-limit';
import { logger } from '../lib/logger';

const INTERVALS = {
  notificationScheduler: 5 * 60 * 1000,   // 5 minutes
  delivery: 5 * 60 * 1000,                 // 5 minutes (fallback — normally event-triggered)
  emailDelivery: 5 * 60 * 1000,            // 5 minutes (fallback — normally event-triggered)
  sessionCleanup: 60 * 60 * 1000,           // 1 hour
  s3Cleanup: 24 * 60 * 60 * 1000,           // 24 hours
  orgCleanup: 24 * 60 * 60 * 1000,          // 24 hours
  rateLimitPrune: 5 * 60 * 1000,            // 5 minutes
};

function wrap(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      logger.error(`Job failed: ${name}`, { error: String(err) });
    }
  };
}

export function startJobs(): () => void {
  // Register processors for event-driven triggering via triggerJob()
  registerProcessor('delivery', processDelivery);
  registerProcessor('email-delivery', processEmailDelivery);

  const timers: ReturnType<typeof setInterval>[] = [];

  const jobs: [string, () => Promise<void>, number][] = [
    ['notification-scheduler', processNotificationScheduler, INTERVALS.notificationScheduler],
    ['delivery', processDelivery, INTERVALS.delivery],
    ['email-delivery', processEmailDelivery, INTERVALS.emailDelivery],
    ['session-cleanup', processSessionCleanup, INTERVALS.sessionCleanup],
    ['s3-cleanup', processS3Cleanup, INTERVALS.s3Cleanup],
    ['org-cleanup', processOrgCleanup, INTERVALS.orgCleanup],
  ];

  // Run each job once immediately, then on interval
  for (const [name, fn, interval] of jobs) {
    wrap(name, fn)();
    timers.push(setInterval(wrap(name, fn), interval));
  }

  // Rate limit map pruning (sync, no async wrapper needed)
  timers.push(setInterval(pruneRateLimitMaps, INTERVALS.rateLimitPrune));

  logger.info('Job intervals started', {
    notificationScheduler: 'every 5m',
    delivery: 'every 5m (fallback) + event-triggered',
    emailDelivery: 'every 5m (fallback) + event-triggered',
    sessionCleanup: 'every 1h',
    s3Cleanup: 'every 24h',
    orgCleanup: 'every 24h',
    rateLimitPrune: 'every 5m',
  });

  return () => {
    for (const timer of timers) clearInterval(timer);
    logger.info('Job intervals stopped');
  };
}
