import { Worker } from 'bullmq';
import { bullmqConnection } from '../lib/redis';
import { processNotificationScheduler } from './processors/notification-scheduler';
import { processSmsSender } from './processors/sms-sender';
import { processEmailSender } from './processors/email-sender';
import { processSessionCleanup } from './processors/session-cleanup';
import { processS3Cleanup } from './processors/s3-cleanup';
import { setupRecurringJobs } from './queues';
import { logger } from '../lib/logger';

export function startWorkers(): Worker[] {
  const notificationWorker = new Worker(
    'notification-scheduler',
    async (job) => processNotificationScheduler(job),
    { connection: bullmqConnection },
  );

  const smsWorker = new Worker(
    'sms-sender',
    async (job) => processSmsSender(job),
    {
      connection: bullmqConnection,
      limiter: { max: 10, duration: 1000 },
    },
  );

  const emailWorker = new Worker(
    'email-sender',
    async (job) => processEmailSender(job),
    {
      connection: bullmqConnection,
      limiter: { max: 5, duration: 1000 },
    },
  );

  const sessionCleanupWorker = new Worker(
    'session-cleanup',
    async (job) => processSessionCleanup(job),
    { connection: bullmqConnection },
  );

  const s3CleanupWorker = new Worker(
    's3-cleanup',
    async (job) => processS3Cleanup(job),
    { connection: bullmqConnection },
  );

  const workers = [notificationWorker, smsWorker, emailWorker, sessionCleanupWorker, s3CleanupWorker];

  for (const worker of workers) {
    worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${worker.name}`, { jobId: job?.id, error: err.message });
    });
  }

  logger.info('All job workers started');
  return workers;
}

export async function initJobs(): Promise<Worker[]> {
  await setupRecurringJobs();
  return startWorkers();
}
