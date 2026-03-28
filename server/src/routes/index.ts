import { Hono } from 'hono';
import health from './health';
import auth from './auth';
import { twoFactorChallenge, twoFactorSetup } from './two-factor';
import obligations from './obligations';
import documents from './documents';
import pto from './pto';
import checklists from './checklists';
import notifications from './notifications';
import profile from './profile';
import settings from './settings';
import stripeRoutes from './stripe';
import stripeWebhook from './stripe-webhook';
import orgs from './orgs';
import orgMembers from './org-members';
import orgInvites from './org-invites';
import invitePublic from './invite-public';
import userInvites from './user-invites';

export function registerRoutes(app: Hono) {
  // Public routes
  app.route('/health', health);
  app.route('/auth', auth);
  app.route('/auth/2fa', twoFactorChallenge);

  // Stripe webhook needs raw body — mounted before auth middleware
  app.route('/stripe', stripeWebhook);

  // Public invite info + acceptance (outside /api/* so auth middleware doesn't apply)
  app.route('/invites', invitePublic);

  // Protected user-scoped routes (auth middleware applied in app.ts)
  app.route('/api/profile', profile);
  app.route('/api/settings', settings);
  app.route('/api/stripe', stripeRoutes);
  app.route('/api/2fa', twoFactorSetup);
  app.route('/api/user/invites', userInvites);

  // Protected org routes — list/create (no org middleware)
  app.route('/api/orgs', orgs);

  // Protected org-scoped routes (org middleware applied in app.ts for /api/orgs/:orgId/*)
  app.route('/api/orgs/:orgId/obligations', obligations);
  app.route('/api/orgs/:orgId/documents', documents);
  app.route('/api/orgs/:orgId/pto', pto);
  app.route('/api/orgs/:orgId/checklists', checklists);
  app.route('/api/orgs/:orgId/notifications', notifications);
  app.route('/api/orgs/:orgId/members', orgMembers);
  app.route('/api/orgs/:orgId/invites', orgInvites);
}
