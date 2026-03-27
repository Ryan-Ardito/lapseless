import { Hono } from 'hono';
import * as inviteSvc from '../services/org-invite.service';
import { checkMemberLimit } from '../middleware/plan-enforcement';
import { requireRole } from '../middleware/require-role';
import { AppError } from '../middleware/error-handler';

const app = new Hono();

// List pending invites (admin+)
app.get('/', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const invites = await inviteSvc.listPendingInvites(org.id);
  return c.json(invites);
});

// Create invite (admin+)
app.post('/', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const user = c.get('user');
  const { email, role } = await c.req.json<{ email: string; role?: string }>();

  if (!email?.trim()) throw new AppError(400, 'Email is required');
  const inviteRole = role && ['admin', 'member', 'viewer'].includes(role)
    ? role as 'admin' | 'member' | 'viewer'
    : 'member';

  await checkMemberLimit(org.id);

  const result = await inviteSvc.createInvite(org.id, user.id, email.trim(), inviteRole);
  // TODO: Send invite email with result.rawToken
  return c.json({ id: result.id, email: result.email, role: result.role, expiresAt: result.expiresAt }, 201);
});

// Revoke invite (admin+)
app.delete('/:inviteId', requireRole('admin'), async (c) => {
  const org = c.get('org');
  const inviteId = c.req.param('inviteId');
  const invite = await inviteSvc.revokeInvite(org.id, inviteId);
  if (!invite) throw new AppError(404, 'Invite not found');
  return c.json({ ok: true });
});

export default app;
