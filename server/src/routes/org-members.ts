import { Hono } from 'hono';
import * as memberSvc from '../services/org-member.service';
import { requireRole } from '../middleware/require-role';
import { AppError } from '../middleware/error-handler';

const app = new Hono();

// List members
app.get('/', async (c) => {
  const org = c.get('org');
  const members = await memberSvc.listMembers(org.id);
  return c.json(members);
});

// Change member role (owner only)
app.patch('/:memberId/role', requireRole('owner'), async (c) => {
  const org = c.get('org');
  const memberId = c.req.param('memberId');
  const { role } = await c.req.json<{ role: string }>();
  if (!['admin', 'member', 'viewer'].includes(role)) {
    throw new AppError(400, 'Invalid role');
  }
  const member = await memberSvc.changeRole(org.id, memberId, role as 'admin' | 'member' | 'viewer');
  if (!member) throw new AppError(404, 'Member not found');
  return c.json(member);
});

// Remove member (admin+, cannot remove owner)
app.delete('/:memberId', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const memberId = c.req.param('memberId');

  // Prevent removing the owner
  const members = await memberSvc.listMembers(org.id);
  const target = members.find((m) => m.id === memberId);
  if (!target) throw new AppError(404, 'Member not found');
  if (target.role === 'owner') throw new AppError(403, 'Cannot remove the organization owner');

  const removed = await memberSvc.removeMember(org.id, memberId);
  if (!removed) throw new AppError(404, 'Member not found');
  return c.json({ ok: true });
});

export default app;
