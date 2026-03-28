import { Hono } from 'hono';
import { env } from '../env';
import { stripe } from '../lib/stripe';
import * as svc from '../services/stripe.service';
import * as orgSvc from '../services/org.service';
import { PLAN_LIMITS, TIER_ORDER, type Tier, type PaidTier } from '../lib/plan-limits';
import { AppError } from '../middleware/error-handler';
import { createCheckoutSchema, changeTierSchema, cancelDowngradeSchema } from '../lib/validators';

const app = new Hono();

/** Verify the calling user owns the given org. Returns the org row. */
async function requireOrgOwner(userId: string, orgId: string) {
  const org = await orgSvc.getOrg(orgId);
  if (!org) throw new AppError(404, 'Organization not found');
  if (org.ownerId !== userId) throw new AppError(403, 'Only the organization owner can manage billing');
  return org;
}

app.post('/create-checkout', async (c) => {
  const user = c.get('user');
  const body = createCheckoutSchema.parse(await c.req.json());
  if (!PLAN_LIMITS[body.tier]) throw new AppError(400, 'Invalid tier');

  if (body.orgId) {
    await requireOrgOwner(user.id, body.orgId);
  }

  if (env.isDev) {
    const redirect = body.orgId
      ? `${env.FRONTEND_URL}/app/orgs/${body.orgId}/settings?billing=mock-success`
      : `${env.FRONTEND_URL}/demo/settings?billing=mock-success`;
    return c.json({ url: redirect });
  }

  const result = await svc.createCheckoutSession(user.id, body.tier, body.orgId);
  return c.json(result);
});

app.post('/change-tier', async (c) => {
  const user = c.get('user');
  const body = changeTierSchema.parse(await c.req.json());

  await requireOrgOwner(user.id, body.orgId);

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
  const body = cancelDowngradeSchema.parse(await c.req.json());

  await requireOrgOwner(user.id, body.orgId);

  if (env.isDev) {
    return c.json({ success: true });
  }

  await svc.cancelPendingDowngrade(user.id);
  return c.json({ success: true });
});

app.get('/downgrade-warnings', async (c) => {
  const user = c.get('user');
  const tier = c.req.query('tier');
  const orgId = c.req.query('orgId');

  if (!tier || !TIER_ORDER.includes(tier as PaidTier)) {
    throw new AppError(400, 'Invalid tier');
  }
  if (!orgId) throw new AppError(400, 'orgId is required');

  await requireOrgOwner(user.id, orgId);

  if (env.isDev) {
    return c.json({ warnings: [] });
  }

  const warnings = await svc.getDowngradeWarnings(user.id, tier as PaidTier);
  return c.json({ warnings });
});

app.get('/portal', async (c) => {
  const user = c.get('user');
  const orgId = c.req.query('orgId');

  if (!orgId) throw new AppError(400, 'orgId is required');
  await requireOrgOwner(user.id, orgId);

  if (env.isDev) {
    return c.json({ url: `${env.FRONTEND_URL}/app/orgs/${orgId}/settings` });
  }

  const result = await svc.createPortalSession(user.id, orgId);
  return c.json(result);
});

app.get('/status', async (c) => {
  const user = c.get('user');
  const orgId = c.req.query('orgId');

  if (env.isDev) {
    return c.json({
      tier: 'growth',
      status: 'active',
      limits: PLAN_LIMITS.growth,
      usage: { obligations: 12, storageBytes: 5242880, smsUsed: 3 },
    });
  }

  // Resolve to the org owner's subscription so all members see the correct plan
  let ownerId = user.id;
  if (orgId) {
    const org = await orgSvc.getOrg(orgId);
    if (org) ownerId = org.ownerId;
  }

  const sub = await svc.syncSubscriptionFromStripe(ownerId);
  const tier = (sub?.tier ?? 'demo') as Tier;
  const usage = await svc.getOwnerUsage(ownerId);
  return c.json({
    tier,
    status: sub?.status ?? 'active',
    limits: PLAN_LIMITS[tier],
    usage,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd,
    pendingTier: sub?.pendingTier ?? null,
    pendingTierScheduledAt: sub?.pendingTierScheduledAt?.toISOString() ?? null,
    isOwner: ownerId === user.id,
  });
});

export default app;
