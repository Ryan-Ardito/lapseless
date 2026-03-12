import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { requestId } from './middleware/request-id';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware, authRateLimitMiddleware } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';
import { registerRoutes } from './routes';
import { logger } from './lib/logger';
import mockOauth from './dev/mock-oauth';
import type { MiddlewareHandler } from 'hono';

const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(`${c.req.method} ${c.req.path}`, {
    status: c.res.status,
    ms,
    requestId: c.get('requestId') as string | undefined,
  });
};

export function createApp() {
  const app = new Hono();

  // Global middleware
  app.use('*', requestId);
  app.use('*', requestLogger);
  app.use(
    '*',
    cors({
      origin: (env.CORS_ORIGINS || env.FRONTEND_URL).split(',').map((u) => u.trim()),
      credentials: true,
    }),
  );
  app.onError(errorHandler);

  // Dev-only mock OAuth routes
  if (env.isDev) {
    app.route('/auth/dev', mockOauth);
  }

  // Auth route rate limiting (IP-based, before auth middleware)
  app.use('/auth/google', authRateLimitMiddleware);
  app.use('/auth/google/callback', authRateLimitMiddleware);

  // Protected API routes — auth + rate limit
  app.use('/api/*', authMiddleware);
  app.use('/api/*', rateLimitMiddleware);

  // Register all routes
  registerRoutes(app);

  return app;
}
