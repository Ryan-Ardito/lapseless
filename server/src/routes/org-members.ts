import { Hono } from 'hono';
import * as memberSvc from '../services/org-member.service';
import { requireRole } from '../middleware/require-role';
import { AppError } from '../middleware/error-handler';

const app = new Hono();

// Leave organization (any member except owner)
app.post('/leave', async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const orgRole = c.get('orgRole');

  if (orgRole === 'owner') {
    throw new AppError(403, 'Organization owner cannot leave. Transfer ownership first.');
  }

  await memberSvc.removeMemberByUserId(org.id, user.id);
  return c.json({ ok: true });
});

// List members (admin+)
app.get('/', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const members = await memberSvc.listMembers(org.id);
  return c.json(members);
});

// Change member role (admin+)
app.patch('/:memberId/role', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  const memberId = c.req.param('memberId');
  const { role } = await c.req.json<{ role: string }>();
  if (!['admin', 'member'].includes(role)) {
    throw new AppError(400, 'Invalid role');
  }

  // Look up target member
  const target = await memberSvc.getMember(org.id, memberId);
  if (!target) throw new AppError(404, 'Member not found');

  // Owner can never be demoted via this endpoint
  if (target.role === 'owner') {
    throw new AppError(403, 'Cannot change the owner\'s role. Use ownership transfer instead.');
  }

  // Admins can only promote members→admin or demote members, not touch other admins
  if (orgRole === 'admin' && target.role === 'admin') {
    throw new AppError(403, 'Admins cannot change the role of other admins');
  }

  const member = await memberSvc.changeRole(org.id, memberId, role as 'admin' | 'member');
  if (!member) throw new AppError(404, 'Member not found');
  return c.json(member);
});

// Remove member (admin+, cannot remove owner or fellow admins)
app.delete('/:memberId', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const orgRole = c.get('orgRole');
  const memberId = c.req.param('memberId');

  const target = await memberSvc.getMember(org.id, memberId);
  if (!target) throw new AppError(404, 'Member not found');
  if (target.role === 'owner') throw new AppError(403, 'Cannot remove the organization owner');
  if (orgRole === 'admin' && target.role === 'admin') {
    throw new AppError(403, 'Admins cannot remove other admins');
  }

  const removed = await memberSvc.removeMember(org.id, memberId);
  if (!removed) throw new AppError(404, 'Member not found');
  return c.json({ ok: true });
});

export default app;
