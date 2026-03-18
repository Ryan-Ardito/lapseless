import { Hono } from 'hono';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');
  return c.json(
    { status: healthy ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() },
    healthy ? 200 : 503,
  );
});

export default app;
