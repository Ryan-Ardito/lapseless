import type { MiddlewareHandler } from 'hono';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

// Sliding-window rate limiter using in-memory maps
// Resets on restart — acceptable (was already gracefully degrading when Redis was unavailable)
const rateLimitMap = new Map<string, number[]>();

export const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    await next();
    return;
  }

  const key = user.id;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = rateLimitMap.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    rateLimitMap.set(key, timestamps);
    const oldest = Math.min(...timestamps);
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    c.header('Retry-After', String(retryAfter));
    return c.json({ error: 'Too many requests' }, 429);
  }

  timestamps.push(now);
  rateLimitMap.set(key, timestamps);

  await next();
};

// IP-based rate limiter for auth endpoints
// 10 req/min and 30 req/hr per IP
const AUTH_MINUTE_WINDOW = 60_000;
const AUTH_MINUTE_MAX = 10;
const AUTH_HOUR_WINDOW = 3_600_000;
const AUTH_HOUR_MAX = 30;

const authMinuteMap = new Map<string, number[]>();
const authHourMap = new Map<string, number[]>();

function getClientIp(c: Parameters<MiddlewareHandler>[0]): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim());
    return parts[parts.length - 1] || 'unknown';
  }
  return c.req.header('x-real-ip') || 'unknown';
}

/** Returns seconds until oldest request in window expires, or 0 if under limit */
function checkWindow(map: Map<string, number[]>, key: string, now: number, windowMs: number, max: number): number {
  let timestamps = map.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > now - windowMs);
  if (timestamps.length >= max) {
    map.set(key, timestamps);
    const oldest = Math.min(...timestamps);
    return Math.ceil((oldest + windowMs - now) / 1000);
  }
  timestamps.push(now);
  map.set(key, timestamps);
  return 0;
}

export const authRateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const ip = getClientIp(c);
  const now = Date.now();

  const minuteRetry = checkWindow(authMinuteMap, ip, now, AUTH_MINUTE_WINDOW, AUTH_MINUTE_MAX);
  if (minuteRetry) {
    c.header('Retry-After', String(minuteRetry));
    return c.json({ error: 'Too many requests' }, 429);
  }

  const hourRetry = checkWindow(authHourMap, ip, now, AUTH_HOUR_WINDOW, AUTH_HOUR_MAX);
  if (hourRetry) {
    c.header('Retry-After', String(hourRetry));
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();
};

// Prune expired entries from all rate limit maps
export function pruneRateLimitMaps() {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap) {
    const filtered = timestamps.filter((t) => t > now - WINDOW_MS);
    if (filtered.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, filtered);
  }
  for (const [key, timestamps] of authMinuteMap) {
    const filtered = timestamps.filter((t) => t > now - AUTH_MINUTE_WINDOW);
    if (filtered.length === 0) authMinuteMap.delete(key);
    else authMinuteMap.set(key, filtered);
  }
  for (const [key, timestamps] of authHourMap) {
    const filtered = timestamps.filter((t) => t > now - AUTH_HOUR_WINDOW);
    if (filtered.length === 0) authHourMap.delete(key);
    else authHourMap.set(key, filtered);
  }
}
