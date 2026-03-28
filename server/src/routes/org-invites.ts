import { Hono } from 'hono';
import * as inviteSvc from '../services/org-invite.service';
import { isMemberByEmail } from '../services/org-member.service';
import { sendInviteEmail } from '../services/email.service';
import { checkMemberLimit } from '../middleware/plan-enforcement';
import { requireRole } from '../middleware/require-role';
import { AppError } from '../middleware/error-handler';
import { logger } from '../lib/logger';

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
  const inviteRole = role && ['admin', 'member'].includes(role)
    ? role as 'admin' | 'member'
    : 'member';

  if (inviteRole === 'admin' && c.get('orgRole') !== 'owner') {
    throw new AppError(403, 'Only the organization owner can invite admins');
  }

  await checkMemberLimit(org.id);

  if (await isMemberByEmail(org.id, email.trim())) {
    throw new AppError(409, 'This email belongs to an existing member of this organization');
  }

  const result = await inviteSvc.createInvite(org.id, user.id, email.trim(), inviteRole);

  // Send invite email (fire-and-forget — invite is created regardless)
  sendInviteEmail(email.trim(), {
    inviterName: user.name || 'A teammate',
    orgName: org.name,
    role: inviteRole,
    inviteToken: result.rawToken,
  }).catch((err) => {
    logger.error('Failed to send invite email', {
      inviteId: result.id,
      email: email.trim(),
      error: String(err),
    });
  });

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
