import { Hono } from 'hono';
import { db } from '../db';
import * as orgSvc from '../services/org.service';
import { checkOrgLimit } from '../middleware/plan-enforcement';
import { orgMiddleware } from '../middleware/org';
import { requireRole } from '../middleware/require-role';
import { AppError } from '../middleware/error-handler';
import { ORG_RECOVERY_WINDOW_MS } from '../lib/constants';
import { uuidParam } from '../lib/validators';

const app = new Hono();

// List all orgs the user belongs to (includes deleted orgs they own for restore UI)
app.get('/', async (c) => {
  const user = c.get('user');
  const orgs = await orgSvc.listUserOrgs(user.id);
  const deletedOrgs = await orgSvc.listDeletedOrgs(user.id);
  return c.json({ orgs, deletedOrgs });
});

// Create a new org
app.post('/', async (c) => {
  const user = c.get('user');
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) throw new AppError(400, 'Organization name is required');
  if (name.trim().length > 100) throw new AppError(400, 'Organization name must be 100 characters or fewer');
  const org = await db.transaction(async (tx) => {
    await checkOrgLimit(user.id, tx);
    return orgSvc.createOrg(user.id, name.trim(), tx);
  });
  return c.json(org, 201);
});

// Update org name (owner only)
app.patch('/:orgId', orgMiddleware, requireRole('owner'), async (c) => {
  const org = c.get('org');
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) throw new AppError(400, 'Organization name is required');
  if (name.trim().length > 100) throw new AppError(400, 'Organization name must be 100 characters or fewer');
  const updated = await orgSvc.updateOrg(org.id, { name: name.trim() });
  return c.json(updated);
});

// Delete org (owner only)
app.delete('/:orgId', orgMiddleware, requireRole('owner'), async (c) => {
  const org = c.get('org');
  await orgSvc.deleteOrg(org.id);
  return c.json({ ok: true });
});

// Transfer ownership (owner only — orgMiddleware applied globally in app.ts)
app.post('/:orgId/transfer', requireRole('owner'), async (c) => {
  const org = c.get('org');
  const { userId } = await c.req.json<{ userId: string }>();
  if (!userId?.trim()) throw new AppError(400, 'Target user ID is required');
  uuidParam.parse(userId);

  const result = await orgSvc.transferOwnership(org.id, userId);
  if (!result) throw new AppError(404, 'Target user is not a member of this organization');
  return c.json(result);
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Restore soft-deleted org (owner only, bypasses orgMiddleware since org is deleted)
app.post('/:orgId/restore', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  if (!orgId || !UUID_RE.test(orgId)) {
    throw new AppError(400, 'Invalid organization ID');
  }
  const org = await orgSvc.getOrg(orgId);
  if (!org || !org.deletedAt) throw new AppError(404, 'Deleted organization not found');
  if (org.ownerId !== user.id) throw new AppError(403, 'Only the owner can restore an organization');

  // Check if within 30-day recovery window
  const deletedAt = new Date(org.deletedAt);
  const thirtyDaysLater = new Date(deletedAt.getTime() + ORG_RECOVERY_WINDOW_MS);
  if (new Date() > thirtyDaysLater) {
    throw new AppError(410, 'Recovery window has expired. Organization was permanently deleted.');
  }

  const restored = await db.transaction(async (tx) => {
    await checkOrgLimit(user.id, tx);
    return orgSvc.restoreOrg(orgId, tx);
  });
  return c.json(restored);
});

export default app;
