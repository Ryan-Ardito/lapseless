import { Hono } from 'hono';
import { env } from '../env';
import { stripe } from '../lib/stripe';
import * as svc from '../services/stripe.service';
import { PLAN_LIMITS, type Tier } from '../lib/plan-limits';
import { AppError } from '../middleware/error-handler';
import { createCheckoutSchema } from '../lib/validators';

const app = new Hono();

app.post('/create-checkout', async (c) => {
  if (env.isDev) {
    return c.json({ url: `${env.FRONTEND_URL}/app/settings?billing=mock-success` });
  }

  const user = c.get('user');
  const body = createCheckoutSchema.parse(await c.req.json());
  if (!PLAN_LIMITS[body.tier]) throw new AppError(400, 'Invalid tier');

  const result = await svc.createCheckoutSession(user.id, body.tier);
  return c.json(result);
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
    });
  }

  const sub = await svc.getSubscription(user.id);
  const tier = (sub?.tier ?? 'solo') as Tier;
  return c.json({
    tier,
    status: sub?.status ?? 'active',
    limits: PLAN_LIMITS[tier],
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString(),
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd,
  });
});

export default app;
