import { db } from '../db';
import { subscriptions, obligations, documents, users } from '../db/schema';
import { eq, and, isNull, count, sum } from 'drizzle-orm';
import { stripe } from '../lib/stripe';
import { env } from '../env';
import { TIER_ORDER, PLAN_LIMITS, TIER_NAMES } from '../lib/plan-limits';
import type { Tier, PaidTier } from '../lib/plan-limits';
import { sendSubscriptionConfirmedEmail, sendPlanChangedEmail, sendSubscriptionCancelledEmail } from './email.service';
import { logger } from '../lib/logger';

const TIER_PRICE_MAP: Record<string, Tier> = {};

function buildPriceMap() {
  if (env.STRIPE_PRICE_SOLO) TIER_PRICE_MAP[env.STRIPE_PRICE_SOLO] = 'solo';
  if (env.STRIPE_PRICE_TEAM) TIER_PRICE_MAP[env.STRIPE_PRICE_TEAM] = 'team';
  if (env.STRIPE_PRICE_GROWTH) TIER_PRICE_MAP[env.STRIPE_PRICE_GROWTH] = 'growth';
  if (env.STRIPE_PRICE_SCALE) TIER_PRICE_MAP[env.STRIPE_PRICE_SCALE] = 'scale';
}
buildPriceMap();

const TIER_TO_PRICE: Record<PaidTier, string> = {
  solo: env.STRIPE_PRICE_SOLO,
  team: env.STRIPE_PRICE_TEAM,
  growth: env.STRIPE_PRICE_GROWTH,
  scale: env.STRIPE_PRICE_SCALE,
};

export async function getSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return sub;
}

export async function syncSubscriptionFromStripe(userId: string) {
  const sub = await getSubscription(userId);
  if (!sub?.stripeCustomerId || !stripe) return sub;

  try {
    const { data: activeSubs } = await stripe.subscriptions.list({
      customer: sub.stripeCustomerId,
      limit: 10,
    });

    if (activeSubs.length === 0) {
      if (sub.tier !== 'demo') {
        const [updated] = await db
          .update(subscriptions)
          .set({
            tier: 'demo',
            status: 'canceled',
            stripeSubscriptionId: null,
            stripePriceId: null,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id))
          .returning();
        return updated;
      }
      return sub;
    }

    const stripeSub = activeSubs[0];
    const item = stripeSub.items?.data?.[0];
    const priceId = item?.price?.id;
    const tier = priceId ? TIER_PRICE_MAP[priceId] : undefined;

    const updates: Record<string, any> = {
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status,
      currentPeriodStart: item ? new Date(item.current_period_start * 1000) : null,
      currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
      updatedAt: new Date(),
    };

    if (tier && !sub.pendingTier) {
      updates.tier = tier;
      updates.stripePriceId = priceId;
    }

    const [updated] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, sub.id))
      .returning();
    return updated;
  } catch (err) {
    console.error('Failed to sync subscription from Stripe:', err);
    return sub;
  }
}

export async function createOrGetStripeCustomer(
  userId: string,
  email: string,
  name: string,
): Promise<string | null> {
  if (!stripe) return null;

  const existing = await getSubscription(userId);
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });

  return customer.id;
}

export async function ensureSubscription(userId: string, stripeCustomerId?: string) {
  const existing = await getSubscription(userId);
  if (existing) {
    if (!existing.stripeCustomerId && stripeCustomerId) {
      const [updated] = await db
        .update(subscriptions)
        .set({ stripeCustomerId, updatedAt: new Date() })
        .where(eq(subscriptions.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [sub] = await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: stripeCustomerId ?? null,
      tier: 'demo',
      status: 'active',
    })
    .returning();
  return sub;
}

async function getUserByStripeCustomerId(customerId: string) {
  const [result] = await db
    .select({ userId: users.id, email: users.email, name: users.name })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  return result ?? null;
}

export async function createCheckoutSession(userId: string, tier: Tier) {
  if (!stripe) throw new Error('Stripe not configured');

  const sub = await ensureSubscription(userId);
  if (!sub.stripeCustomerId) throw new Error('No Stripe customer');

  const priceId = TIER_TO_PRICE[tier as PaidTier];
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
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  const synced = await syncSubscriptionFromStripe(sub.userId);
  const tier = synced?.tier ?? sub.tier;

  const user = await getUserByStripeCustomerId(customerId);
  if (user && tier !== 'demo') {
    sendSubscriptionConfirmedEmail(user.email, user.name, TIER_NAMES[tier as Tier]).catch((err) => {
      logger.error('Failed to send subscription confirmed email', { error: String(err) });
    });
  }
}

export async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer as string;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id;
  const tier = priceId ? TIER_PRICE_MAP[priceId] : undefined;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);

  const oldTier = sub?.tier;

  const updates: Record<string, any> = {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: item?.current_period_start ? new Date(item.current_period_start * 1000) : null,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    updatedAt: new Date(),
  };

  if (tier && !sub?.pendingTier) {
    updates.tier = tier;
    updates.stripePriceId = priceId;
  }

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.stripeCustomerId, customerId));

  // Send plan changed email if tier actually changed
  const newTier = updates.tier ?? oldTier;
  if (tier && oldTier && newTier !== oldTier && oldTier !== 'demo') {
    const user = await getUserByStripeCustomerId(customerId);
    if (user) {
      const oldIdx = TIER_ORDER.indexOf(oldTier as PaidTier);
      const newIdx = TIER_ORDER.indexOf(newTier as PaidTier);
      const direction = newIdx > oldIdx ? 'upgrade' as const : 'downgrade' as const;
      sendPlanChangedEmail(user.email, {
        name: user.name,
        oldTier: TIER_NAMES[oldTier as Tier],
        newTier: TIER_NAMES[newTier as Tier],
        direction,
      }).catch((err) => {
        logger.error('Failed to send plan changed email', { error: String(err) });
      });
    }
  }
}

export async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer as string;

  // Look up user before the update (we just need email/name)
  const user = await getUserByStripeCustomerId(customerId);

  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      tier: 'demo',
      stripeSubscriptionId: null,
      stripePriceId: null,
      pendingTier: null,
      pendingTierScheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));

  if (user) {
    sendSubscriptionCancelledEmail(user.email, user.name).catch((err) => {
      logger.error('Failed to send subscription cancelled email', { error: String(err) });
    });
  }
}

export async function handleInvoicePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer as string;
  const isCycleRenewal = invoice.billing_reason === 'subscription_cycle';

  const updates: Record<string, any> = { updatedAt: new Date() };

  let appliedDowngrade: { oldTier: Tier; newTier: Tier } | null = null;

  if (isCycleRenewal) {
    updates.smsUsedThisMonth = 0;
    updates.smsResetAt = new Date();

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .limit(1);

    if (sub?.pendingTier) {
      appliedDowngrade = { oldTier: sub.tier as Tier, newTier: sub.pendingTier as Tier };
      updates.tier = sub.pendingTier;
      updates.pendingTier = null;
      updates.pendingTierScheduledAt = null;
    }
  }

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.stripeCustomerId, customerId));

  if (appliedDowngrade) {
    const user = await getUserByStripeCustomerId(customerId);
    if (user) {
      sendPlanChangedEmail(user.email, {
        name: user.name,
        oldTier: TIER_NAMES[appliedDowngrade.oldTier],
        newTier: TIER_NAMES[appliedDowngrade.newTier],
        direction: 'downgrade',
      }).catch((err) => {
        logger.error('Failed to send plan changed email', { error: String(err) });
      });
    }
  }
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

export async function changeTier(userId: string, newTier: PaidTier) {
  if (!stripe) throw new Error('Stripe not configured');

  const sub = await getSubscription(userId);
  if (!sub?.stripeSubscriptionId) throw new Error('No active subscription');

  const currentIndex = TIER_ORDER.indexOf(sub.tier as PaidTier);
  const newIndex = TIER_ORDER.indexOf(newTier);
  if (currentIndex === newIndex) throw new Error('Already on this tier');
  if (currentIndex === -1) throw new Error('Cannot change tier from demo — use checkout');

  const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) throw new Error('No subscription item found');

  const priceId = TIER_TO_PRICE[newTier];
  if (!priceId) throw new Error(`No price configured for tier: ${newTier}`);

  const isUpgrade = newIndex > currentIndex;

  if (isUpgrade) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
    });

    const [updated] = await db
      .update(subscriptions)
      .set({
        tier: newTier,
        stripePriceId: priceId,
        pendingTier: null,
        pendingTierScheduledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id))
      .returning();

    return { subscription: updated, direction: 'upgrade' as const };
  }

  // Downgrade: write pendingTier BEFORE calling Stripe to avoid webhook race
  await db
    .update(subscriptions)
    .set({
      pendingTier: newTier,
      pendingTierScheduledAt: sub.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'none',
  });

  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, sub.id))
    .limit(1);

  return { subscription: updated, direction: 'downgrade' as const };
}

export async function cancelPendingDowngrade(userId: string) {
  if (!stripe) throw new Error('Stripe not configured');

  const sub = await getSubscription(userId);
  if (!sub?.pendingTier) throw new Error('No pending downgrade');
  if (!sub.stripeSubscriptionId) throw new Error('No active subscription');

  const currentPriceId = TIER_TO_PRICE[sub.tier as PaidTier];
  if (!currentPriceId) throw new Error('Cannot resolve current tier price');

  const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
  const itemId = stripeSub.items.data[0]?.id;
  if (!itemId) throw new Error('No subscription item found');

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    items: [{ id: itemId, price: currentPriceId }],
    proration_behavior: 'none',
  });

  await db
    .update(subscriptions)
    .set({
      pendingTier: null,
      pendingTierScheduledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));
}

export async function getDowngradeWarnings(userId: string, targetTier: PaidTier): Promise<string[]> {
  const usage = await getUserUsage(userId);
  const limits = PLAN_LIMITS[targetTier];
  const warnings: string[] = [];

  if (limits.obligations !== null && usage.obligations > limits.obligations) {
    warnings.push(`You have ${usage.obligations} obligations but ${targetTier} allows ${limits.obligations}. You won't be able to create new ones until under the limit.`);
  }

  const storageLimitBytes = limits.storageMB * 1024 * 1024;
  if (usage.storageBytes > storageLimitBytes) {
    const usedMB = (usage.storageBytes / (1024 * 1024)).toFixed(1);
    warnings.push(`You're using ${usedMB} MB of storage but ${targetTier} allows ${limits.storageMB} MB. You won't be able to upload new files until under the limit.`);
  }

  if (usage.smsUsed > limits.smsPerMonth) {
    warnings.push(`You've used ${usage.smsUsed} SMS credits this month but ${targetTier} allows ${limits.smsPerMonth}. SMS credits reset each billing cycle.`);
  }

  return warnings;
}

export async function getUserUsage(userId: string) {
  const [obligationResult, storageResult, subscriptionResult] = await Promise.all([
    db.select({ value: count() }).from(obligations)
      .where(and(eq(obligations.userId, userId), isNull(obligations.deletedAt))),
    db.select({ value: sum(documents.size) }).from(documents)
      .where(and(eq(documents.userId, userId), isNull(documents.deletedAt))),
    db.select({ smsUsed: subscriptions.smsUsedThisMonth }).from(subscriptions)
      .where(eq(subscriptions.userId, userId)).limit(1),
  ]);
  return {
    obligations: Number(obligationResult[0]?.value ?? 0),
    storageBytes: Number(storageResult[0]?.value ?? 0),
    smsUsed: subscriptionResult[0]?.smsUsed ?? 0,
  };
}
