import { Worker } from 'bullmq';
import { bullmqConnection } from '../lib/redis';
import { processNotificationScheduler } from './processors/notification-scheduler';
import { processSmsSender } from './processors/sms-sender';
import { processEmailSender } from './processors/email-sender';
import { setupRecurringJobs } from './queues';

export function startWorkers() {
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
    { connection: bullmqConnection },
  );

  notificationWorker.on('failed', (job, err) => {
    console.error(`[notification-scheduler] Job ${job?.id} failed:`, err.message);
  });

  smsWorker.on('failed', (job, err) => {
    console.error(`[sms-sender] Job ${job?.id} failed:`, err.message);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`[email-sender] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Workers] All job workers started');
}

export async function initJobs() {
  await setupRecurringJobs();
  startWorkers();
}
