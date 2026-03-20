import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
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
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('X-XSS-Protection', '0');
    if (env.isProd) {
      c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    }
    if (env.SERVE_STATIC) {
      c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self'");
    }
  });
  app.onError(errorHandler);

  // Dev-only mock OAuth routes
  if (env.isDev) {
    app.route('/auth/dev', mockOauth);
  }

  // Auth route rate limiting (IP-based, before auth middleware)
  app.use('/auth/google', authRateLimitMiddleware);
  app.use('/auth/google/callback', authRateLimitMiddleware);
  app.use('/auth/2fa/*', authRateLimitMiddleware);

  // Protected API routes — auth + rate limit
  app.use('/api/*', authMiddleware);
  app.use('/api/*', rateLimitMiddleware);

  // Register all routes
  registerRoutes(app);

  // Serve frontend static files in production (Railway)
  if (env.SERVE_STATIC) {
    app.use('/*', serveStatic({ root: '../dist' }));
    // SPA fallback: serve index.html for any unmatched route
    app.get('*', serveStatic({ root: '../dist', path: 'index.html' }));
  }

  return app;
}
