import { createApp } from './app';
import { env } from './env';
import { initJobs } from './jobs';
import { redis } from './lib/redis';
import { logger } from './lib/logger';
import type { Worker } from 'bullmq';

const app = createApp();

let workers: Worker[] = [];

initJobs()
  .then((w) => {
    workers = w;
  })
  .catch((err) => {
    logger.error('Failed to initialize jobs', { error: String(err) });
  });

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);

  // Close all BullMQ workers
  await Promise.allSettled(workers.map((w) => w.close()));

  // Close Redis connection
  redis.disconnect();

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info(`Lapseless API running on port ${env.PORT} (${env.NODE_ENV})`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
