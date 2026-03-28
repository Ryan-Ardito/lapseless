import { Hono } from 'hono';
import { listPendingInvitesForUser, acceptInviteById } from '../services/org-invite.service';
import { isMember } from '../services/org-member.service';
import { checkMemberLimit } from '../middleware/plan-enforcement';
import { AppError } from '../middleware/error-handler';

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
  const inviteId = c.req.param('inviteId');

  const invites = await listPendingInvitesForUser(user.email);
  const invite = invites.find((i) => i.id === inviteId);
  if (!invite) {
    throw new AppError(404, 'Invite not found or expired');
  }

  if (await isMember(invite.organizationId, user.id)) {
    throw new AppError(409, 'You are already a member of this organization');
  }

  await checkMemberLimit(invite.organizationId);

  const result = await acceptInviteById(inviteId, user.id, user.email);
  if (!result) throw new AppError(404, 'Invite not found or already used');

  return c.json({ orgId: result.organizationId, role: result.role });
});

export default app;
