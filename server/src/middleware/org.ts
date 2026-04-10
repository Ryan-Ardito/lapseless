import type { MiddlewareHandler } from 'hono';
import { db } from '../db';
import { organizations, organizationMembers } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const orgMiddleware: MiddlewareHandler = async (c, next) => {
  const orgId = c.req.param('orgId');
  if (!orgId || !UUID_RE.test(orgId)) {
    return c.json({ error: 'Invalid organization ID' }, 400);
  }

  const userId = c.get('user').id;

  const result = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      ownerId: organizations.ownerId,
      defaultPtoAllowance: organizations.defaultPtoAllowance,
      role: organizationMembers.role,
    })
    .from(organizations)
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, organizations.id),
        eq(organizationMembers.userId, userId),
      ),
    )
    .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Organization not found' }, 404);
  }

  const row = result[0];
  c.set('org', {
    id: row.orgId,
    name: row.orgName,
    ownerId: row.ownerId,
    defaultPtoAllowance: row.defaultPtoAllowance,
  });
  c.set('orgRole', row.role);

  await next();
};
