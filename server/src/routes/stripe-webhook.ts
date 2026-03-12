import { Hono } from 'hono';
import { env } from '../env';
import { stripe } from '../lib/stripe';
import * as svc from '../services/stripe.service';
import { AppError } from '../middleware/error-handler';

const app = new Hono();

app.post('/webhook', async (c) => {
  if (env.isDev) return c.json({ ok: true });
  if (!stripe) throw new AppError(500, 'Stripe not configured');

  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');
  if (!sig) throw new AppError(400, 'Missing stripe-signature header');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new AppError(400, 'Invalid webhook signature');
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await svc.handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await svc.handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await svc.handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await svc.handleInvoicePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await svc.handleInvoicePaymentFailed(event.data.object);
      break;
  }

  return c.json({ received: true });
});

export default app;
