import { processNotificationScheduler } from './processors/notification-scheduler';
import { processDelivery } from './processors/delivery';
import { processSessionCleanup } from './processors/session-cleanup';
import { processS3Cleanup } from './processors/s3-cleanup';
import { pruneRateLimitMaps } from '../middleware/rate-limit';
import { logger } from '../lib/logger';

const INTERVALS = {
  notificationScheduler: 15 * 60 * 1000,  // 15 minutes
  delivery: 60 * 1000,                      // 1 minute
  sessionCleanup: 60 * 60 * 1000,           // 1 hour
  s3Cleanup: 24 * 60 * 60 * 1000,           // 24 hours
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
  const timers: ReturnType<typeof setInterval>[] = [];

  const jobs: [string, () => Promise<void>, number][] = [
    ['notification-scheduler', processNotificationScheduler, INTERVALS.notificationScheduler],
    ['delivery', processDelivery, INTERVALS.delivery],
    ['session-cleanup', processSessionCleanup, INTERVALS.sessionCleanup],
    ['s3-cleanup', processS3Cleanup, INTERVALS.s3Cleanup],
  ];

  // Run each job once immediately, then on interval
  for (const [name, fn, interval] of jobs) {
    wrap(name, fn)();
    timers.push(setInterval(wrap(name, fn), interval));
  }

  // Rate limit map pruning (sync, no async wrapper needed)
  timers.push(setInterval(pruneRateLimitMaps, INTERVALS.rateLimitPrune));

  logger.info('Job intervals started', {
    notificationScheduler: 'every 15m',
    delivery: 'every 1m',
    sessionCleanup: 'every 1h',
    s3Cleanup: 'every 24h',
    rateLimitPrune: 'every 5m',
  });

  return () => {
    for (const timer of timers) clearInterval(timer);
    logger.info('Job intervals stopped');
  };
}
