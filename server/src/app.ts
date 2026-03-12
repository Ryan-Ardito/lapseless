import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { env } from './env';
import { requestId } from './middleware/request-id';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { registerRoutes } from './routes';
import mockOauth from './dev/mock-oauth';

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use('*', requestId);
  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.onError(errorHandler);

  // Dev-only mock OAuth routes
  if (env.isDev) {
    app.route('/auth/dev', mockOauth);
  }

  // Protected API routes — auth + rate limit
  app.use('/api/*', authMiddleware);
  app.use('/api/*', rateLimitMiddleware);

  // Register all routes
  registerRoutes(app);

  return app;
}
