import { db } from '../db';
import { subscriptions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '../lib/stripe';
import { env } from '../env';
import type { Tier } from '../lib/plan-limits';

const TIER_PRICE_MAP: Record<string, Tier> = {};

function buildPriceMap() {
  if (env.STRIPE_PRICE_STARTER) TIER_PRICE_MAP[env.STRIPE_PRICE_STARTER] = 'starter';
  if (env.STRIPE_PRICE_BASIC) TIER_PRICE_MAP[env.STRIPE_PRICE_BASIC] = 'basic';
  if (env.STRIPE_PRICE_PROFESSIONAL) TIER_PRICE_MAP[env.STRIPE_PRICE_PROFESSIONAL] = 'professional';
  if (env.STRIPE_PRICE_BUSINESS) TIER_PRICE_MAP[env.STRIPE_PRICE_BUSINESS] = 'business';
}
buildPriceMap();

const TIER_TO_PRICE: Record<Tier, string> = {
  starter: env.STRIPE_PRICE_STARTER,
  basic: env.STRIPE_PRICE_BASIC,
  professional: env.STRIPE_PRICE_PROFESSIONAL,
  business: env.STRIPE_PRICE_BUSINESS,
};

export async function getSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return sub;
}

export async function ensureSubscription(userId: string, stripeCustomerId?: string) {
  const existing = await getSubscription(userId);
  if (existing) return existing;

  const [sub] = await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: stripeCustomerId ?? null,
      tier: 'starter',
      status: 'active',
    })
    .returning();
  return sub;
}

export async function createCheckoutSession(userId: string, tier: Tier) {
  if (!stripe) throw new Error('Stripe not configured');

  const sub = await ensureSubscription(userId);
  if (!sub.stripeCustomerId) throw new Error('No Stripe customer');

  const priceId = TIER_TO_PRICE[tier];
  if (!priceId) throw new Error(`No price configured for tier: ${tier}`);

  const session = await stripe.checkout.sessions.create({
    customer: sub.stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/app/settings?billing=success`,
    cancel_url: `${env.FRONTEND_URL}/app/settings?billing=cancel`,
  });

  return { url: session.url };
}

export async function createPortalSession(userId: string) {
  if (!stripe) throw new Error('Stripe not configured');

  const sub = await getSubscription(userId);
  if (!sub?.stripeCustomerId) throw new Error('No Stripe customer');

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.FRONTEND_URL}/app/settings`,
  });

  return { url: session.url };
}

export async function handleCheckoutCompleted(session: any) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  if (!sub) return;

  await db
    .update(subscriptions)
    .set({
      stripeSubscriptionId: subscriptionId,
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));
}

export async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? TIER_PRICE_MAP[priceId] : undefined;

  const updates: Record<string, any> = {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    updatedAt: new Date(),
  };

  if (tier) {
    updates.tier = tier;
    updates.stripePriceId = priceId;
  }

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

export async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer as string;
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      tier: 'starter',
      stripeSubscriptionId: null,
      stripePriceId: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

export async function handleInvoicePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer as string;
  await db
    .update(subscriptions)
    .set({
      smsUsedThisMonth: 0,
      smsResetAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

export async function handleInvoicePaymentFailed(invoice: any) {
  const customerId = invoice.customer as string;
  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}
