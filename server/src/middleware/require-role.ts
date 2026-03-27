import type { MiddlewareHandler } from 'hono';
import type { OrgRole } from './auth';

const ROLE_LEVELS: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function requireRole(minimumRole: OrgRole): MiddlewareHandler {
  return async (c, next) => {
    const userRole = c.get('orgRole');
    if (ROLE_LEVELS[userRole] < ROLE_LEVELS[minimumRole]) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  };
}
