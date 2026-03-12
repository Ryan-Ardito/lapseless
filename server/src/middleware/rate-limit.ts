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

// IP-based rate limiter for auth endpoints
// 10 req/min and 30 req/hr per IP
const AUTH_MINUTE_WINDOW = 60_000;
const AUTH_MINUTE_MAX = 10;
const AUTH_HOUR_WINDOW = 3_600_000;
const AUTH_HOUR_MAX = 30;

function getClientIp(c: Parameters<MiddlewareHandler>[0]): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

export const authRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const ip = getClientIp(c);

  try {
    const now = Date.now();

    // Check minute window
    const minuteKey = `rl:auth:min:${ip}`;
    const minuteMulti = redis.multi();
    minuteMulti.zremrangebyscore(minuteKey, 0, now - AUTH_MINUTE_WINDOW);
    minuteMulti.zadd(minuteKey, now, `${now}:${Math.random()}`);
    minuteMulti.zcard(minuteKey);
    minuteMulti.pexpire(minuteKey, AUTH_MINUTE_WINDOW);
    const minuteResults = await minuteMulti.exec();

    const minuteCount = minuteResults?.[2]?.[1] as number;
    if (minuteCount > AUTH_MINUTE_MAX) {
      return c.json({ error: 'Too many requests' }, 429);
    }

    // Check hour window
    const hourKey = `rl:auth:hr:${ip}`;
    const hourMulti = redis.multi();
    hourMulti.zremrangebyscore(hourKey, 0, now - AUTH_HOUR_WINDOW);
    hourMulti.zadd(hourKey, now, `${now}:${Math.random()}`);
    hourMulti.zcard(hourKey);
    hourMulti.pexpire(hourKey, AUTH_HOUR_WINDOW);
    const hourResults = await hourMulti.exec();

    const hourCount = hourResults?.[2]?.[1] as number;
    if (hourCount > AUTH_HOUR_MAX) {
      return c.json({ error: 'Too many requests' }, 429);
    }
  } catch {
    // Redis unavailable — skip rate limiting
  }

  await next();
};
