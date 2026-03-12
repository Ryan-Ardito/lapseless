import type { MiddlewareHandler } from 'hono';
import { redis } from '../lib/redis';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get('user');
  // If no user yet (auth hasn't run), skip rate limiting
  if (!user) {
    await next();
    return;
  }

  try {
    const key = `rl:${user.id}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}:${Math.random()}`);
    multi.zcard(key);
    multi.pexpire(key, WINDOW_MS);
    const results = await multi.exec();

    const count = results?.[2]?.[1] as number;
    if (count > MAX_REQUESTS) {
      return c.json({ error: 'Too many requests' }, 429);
    }
  } catch {
    // Redis unavailable — skip rate limiting
  }

  await next();
};
