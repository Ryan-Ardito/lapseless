import { Hono } from 'hono';
import * as inviteSvc from '../services/org-invite.service';
import { isMember } from '../services/org-member.service';
import { authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const app = new Hono();

function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}

// Get invite info (public — for showing "you've been invited" page)
app.get('/:token', async (c) => {
  const token = c.req.param('token');
  const invite = await inviteSvc.getInviteByToken(token);
  if (!invite || invite.status !== 'pending') {
    throw new AppError(404, 'Invite not found or expired');
  }
  if (invite.expiresAt < new Date()) {
    throw new AppError(410, 'Invite has expired');
  }
  return c.json({
    orgName: invite.orgName,
    inviterName: invite.inviterName,
    role: invite.role,
    email: redactEmail(invite.email),
  });
});

// Accept invite (requires auth)
app.post('/:token/accept', authMiddleware, async (c) => {
  const token = c.req.param('token');
  const user = c.get('user');

  const preview = await inviteSvc.getInviteByToken(token);
  if (!preview || preview.status !== 'pending') {
    throw new AppError(404, 'Invite not found or expired');
  }
  if (preview.expiresAt < new Date()) {
    throw new AppError(410, 'Invite has expired');
  }
  if (preview.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new AppError(403, 'This invite was sent to a different email address');
  }

  if (await isMember(preview.organizationId, user.id)) {
    return c.json({ error: 'You are already a member of this organization', orgId: preview.organizationId }, 409);
  }

  const result = await inviteSvc.acceptInvite(token, user.id);
  if (!result) throw new AppError(404, 'Invite not found or already used');

  return c.json({ orgId: result.organizationId, role: result.role });
});

export default app;
