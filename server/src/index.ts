import { createApp } from './app';
import { env } from './env';
import { startJobs } from './jobs';
import { logger } from './lib/logger';

const app = createApp();

const stopJobs = startJobs();

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  stopJobs();
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
