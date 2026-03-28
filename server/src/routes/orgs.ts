import { Hono } from 'hono';
import * as orgSvc from '../services/org.service';
import { checkOrgLimit } from '../middleware/plan-enforcement';
import { orgMiddleware } from '../middleware/org';
import { requireRole } from '../middleware/require-role';
import { AppError } from '../middleware/error-handler';

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
  await checkOrgLimit(user.id);
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) throw new AppError(400, 'Organization name is required');
  const org = await orgSvc.createOrg(user.id, name.trim());
  return c.json(org, 201);
});

// Update org name (owner only)
app.patch('/:orgId', orgMiddleware, requireRole('owner'), async (c) => {
  const org = c.get('org');
  const { name } = await c.req.json<{ name: string }>();
  if (!name?.trim()) throw new AppError(400, 'Organization name is required');
  const updated = await orgSvc.updateOrg(org.id, { name: name.trim() });
  return c.json(updated);
});

// Delete org (owner only)
app.delete('/:orgId', orgMiddleware, requireRole('owner'), async (c) => {
  const org = c.get('org');
  await orgSvc.deleteOrg(org.id);
  return c.json({ ok: true });
});

// Transfer ownership (owner only)
app.post('/:orgId/transfer', orgMiddleware, requireRole('owner'), async (c) => {
  const org = c.get('org');
  const { userId } = await c.req.json<{ userId: string }>();
  if (!userId?.trim()) throw new AppError(400, 'Target user ID is required');
  const result = await orgSvc.transferOwnership(org.id, userId);
  if (!result) throw new AppError(404, 'Target user is not a member of this organization');
  return c.json(result);
});

// Restore soft-deleted org (owner only, bypasses orgMiddleware since org is deleted)
app.post('/:orgId/restore', async (c) => {
  const user = c.get('user');
  const orgId = c.req.param('orgId');
  const org = await orgSvc.getOrg(orgId);
  if (!org || !org.deletedAt) throw new AppError(404, 'Deleted organization not found');
  if (org.ownerId !== user.id) throw new AppError(403, 'Only the owner can restore an organization');

  // Check if within 30-day recovery window
  const deletedAt = new Date(org.deletedAt);
  const thirtyDaysLater = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (new Date() > thirtyDaysLater) {
    throw new AppError(410, 'Recovery window has expired. Organization was permanently deleted.');
  }

  const restored = await orgSvc.restoreOrg(orgId);
  return c.json(restored);
});

export default app;
