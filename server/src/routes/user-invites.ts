import { Hono } from 'hono';
import { listPendingInvitesForUser, getPendingInviteForUser, acceptInviteById, declineInviteById } from '../services/org-invite.service';
import { isMember } from '../services/org-member.service';
import { AppError } from '../middleware/error-handler';
import { uuidParam } from '../lib/validators';

const app = new Hono();

// List pending invites for the current user
app.get('/', async (c) => {
  const user = c.get('user');
  const invites = await listPendingInvitesForUser(user.email);
  return c.json(invites);
});

// Accept invite by ID (for org management page)
app.post('/:inviteId/accept', async (c) => {
  const user = c.get('user');
  const inviteId = uuidParam.parse(c.req.param('inviteId'));

  const invite = await getPendingInviteForUser(inviteId, user.email);
  if (!invite) {
    throw new AppError(404, 'Invite not found or expired');
  }

  if (await isMember(invite.organizationId, user.id)) {
    throw new AppError(409, 'You are already a member of this organization');
  }

  const result = await acceptInviteById(inviteId, user.id, user.email);
  if (!result) throw new AppError(404, 'Invite not found or already used');

  return c.json({ orgId: result.organizationId, role: result.role });
});

// Decline invite by ID (for org management page)
app.post('/:inviteId/decline', async (c) => {
  const user = c.get('user');
  const inviteId = uuidParam.parse(c.req.param('inviteId'));

  const result = await declineInviteById(inviteId, user.email);
  if (!result) throw new AppError(404, 'Invite not found or already used');

  return c.json({ ok: true });
});

export default app;
