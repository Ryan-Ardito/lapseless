import { describe, expect, test, mock } from 'bun:test';
import { Hono } from 'hono';
import { ZodError, z } from 'zod';

// Mock the logger to avoid importing env.ts
mock.module('../lib/logger', () => ({
  logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { errorHandler, AppError } = await import('./error-handler');

function buildApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('requestId' as any, 'req-test-123');
    await next();
  });
  app.onError(errorHandler);
  return app;
}

describe('errorHandler', () => {
  test('ZodError → 400 with fields', async () => {
    const app = buildApp();
    app.post('/test', async (c) => {
      z.object({ name: z.string().min(1) }).parse({ name: '' });
      return c.text('ok');
    });

    const res = await app.request('/test', { method: 'POST', body: '{}' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation error');
    expect(body.fields).toBeDefined();
    expect(body.requestId).toBe('req-test-123');
  });

  test('AppError(404) → 404', async () => {
    const app = buildApp();
    app.get('/test', () => {
      throw new AppError(404, 'Not found');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
    expect(body.requestId).toBe('req-test-123');
  });

  test('AppError(403) → 403', async () => {
    const app = buildApp();
    app.get('/test', () => {
      throw new AppError(403, 'Forbidden');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Forbidden');
  });

  test('generic Error → 500', async () => {
    const app = buildApp();
    app.get('/test', () => {
      throw new Error('boom');
    });

    const res = await app.request('/test');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(body.requestId).toBe('req-test-123');
  });

  test('all responses include requestId', async () => {
    const app = buildApp();
    app.get('/zod', () => { z.string().parse(123); return new Response(); });
    app.get('/app', () => { throw new AppError(400, 'bad'); });
    app.get('/gen', () => { throw new Error('x'); });

    for (const path of ['/zod', '/app', '/gen']) {
      const res = await app.request(path);
      const body = await res.json();
      expect(body.requestId).toBe('req-test-123');
    }
  });
});
