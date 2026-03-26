import { Hono } from 'hono';
import { env } from '../env';
import { stripe } from '../lib/stripe';
import * as svc from '../services/stripe.service';
import { PLAN_LIMITS, TIER_ORDER, type Tier, type PaidTier } from '../lib/plan-limits';
import { AppError } from '../middleware/error-handler';
import { createCheckoutSchema } from '../lib/validators';

const app = new Hono();

app.post('/create-checkout', async (c) => {
  if (env.isDev) {
    return c.json({ url: `${env.FRONTEND_URL}/demo/settings?billing=mock-success` });
  }

  const user = c.get('user');
  const body = createCheckoutSchema.parse(await c.req.json());
  if (!PLAN_LIMITS[body.tier]) throw new AppError(400, 'Invalid tier');

  const result = await svc.createCheckoutSession(user.id, body.tier);
  return c.json(result);
});

app.post('/change-tier', async (c) => {
  const user = c.get('user');
  const body = createCheckoutSchema.parse(await c.req.json());

  if (env.isDev) {
    return c.json({ success: true, direction: 'upgrade' });
  }

  const result = await svc.changeTier(user.id, body.tier as PaidTier);
  return c.json({
    success: true,
    direction: result.direction,
    pendingTier: result.subscription.pendingTier,
    effectiveAt: result.subscription.pendingTierScheduledAt?.toISOString(),
  });
});

app.post('/cancel-downgrade', async (c) => {
  const user = c.get('user');

  if (env.isDev) {
    return c.json({ success: true });
  }

  await svc.cancelPendingDowngrade(user.id);
  return c.json({ success: true });
});

app.get('/downgrade-warnings', async (c) => {
  const user = c.get('user');
  const tier = c.req.query('tier');

  if (!tier || !TIER_ORDER.includes(tier as PaidTier)) {
    throw new AppError(400, 'Invalid tier');
  }

  if (env.isDev) {
    return c.json({ warnings: [] });
  }

  const warnings = await svc.getDowngradeWarnings(user.id, tier as PaidTier);
  return c.json({ warnings });
});

app.get('/portal', async (c) => {
  if (env.isDev) {
    return c.json({ url: `${env.FRONTEND_URL}/app/settings` });
  }

  const user = c.get('user');
  const result = await svc.createPortalSession(user.id);
  return c.json(result);
});

app.get('/status', async (c) => {
  const user = c.get('user');

  if (env.isDev) {
    return c.json({
      tier: 'growth',
      status: 'active',
      limits: PLAN_LIMITS.growth,
      usage: { obligations: 12, storageBytes: 5242880, smsUsed: 3 },
    });
  }

  const sub = await svc.syncSubscriptionFromStripe(user.id);
  const tier = (sub?.tier ?? 'demo') as Tier;
  const usage = await svc.getUserUsage(user.id);
  return c.json({
    tier,
    status: sub?.status ?? 'active',
    limits: PLAN_LIMITS[tier],
    usage,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd,
    pendingTier: sub?.pendingTier ?? null,
    pendingTierScheduledAt: sub?.pendingTierScheduledAt?.toISOString() ?? null,
  });
});

export default app;
