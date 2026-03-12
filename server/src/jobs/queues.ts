import { Queue } from 'bullmq';
import { bullmqConnection } from '../lib/redis';

export const notificationSchedulerQueue = new Queue('notification-scheduler', { connection: bullmqConnection });
export const smsSenderQueue = new Queue('sms-sender', { connection: bullmqConnection });
export const emailSenderQueue = new Queue('email-sender', { connection: bullmqConnection });

export async function setupRecurringJobs() {
  // Remove existing repeatable jobs to avoid duplicates
  const existing = await notificationSchedulerQueue.getRepeatableJobs();
  for (const job of existing) {
    await notificationSchedulerQueue.removeRepeatableByKey(job.key);
  }

  // Schedule notification check every 15 minutes
  await notificationSchedulerQueue.add(
    'check-notifications',
    {},
    {
      repeat: { every: 15 * 60 * 1000 },
    },
  );

  console.log('[Jobs] Recurring notification scheduler set up (every 15 min)');
}
