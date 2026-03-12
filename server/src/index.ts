import { createApp } from './app';
import { env } from './env';
import { initJobs } from './jobs';

const app = createApp();

// Start BullMQ workers
initJobs().catch((err) => {
  console.error('Failed to initialize jobs:', err);
});

console.log(`Lapseless API running on port ${env.PORT} (${env.NODE_ENV})`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
