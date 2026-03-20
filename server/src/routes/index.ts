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

export function registerRoutes(app: Hono) {
  // Public routes
  app.route('/health', health);
  app.route('/auth', auth);
  app.route('/auth/2fa', twoFactorChallenge);

  // Stripe webhook needs raw body — mounted before auth middleware
  app.route('/stripe', stripeWebhook);

  // Protected API routes (auth middleware applied in app.ts)
  app.route('/api/obligations', obligations);
  app.route('/api/documents', documents);
  app.route('/api/pto', pto);
  app.route('/api/checklists', checklists);
  app.route('/api/notifications', notifications);
  app.route('/api/profile', profile);
  app.route('/api/settings', settings);
  app.route('/api/stripe', stripeRoutes);
  app.route('/api/2fa', twoFactorSetup);
}
