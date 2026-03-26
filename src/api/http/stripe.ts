import { apiFetch } from './client';
import type { Tier } from '../../lib/plan-display';

export interface SubscriptionStatus {
  tier: Tier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  limits: {
    obligations: number | null;
    users: number;
    storageMB: number;
    smsPerMonth: number;
  };
  usage: {
    obligations: number;
    storageBytes: number;
    smsUsed: number;
  };
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  pendingTier?: string | null;
  pendingTierScheduledAt?: string | null;
}

export function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiFetch('/api/stripe/status');
}

export function getPortalUrl(): Promise<{ url: string }> {
  return apiFetch('/api/stripe/portal');
}

export function createCheckout(tier: string): Promise<{ url: string }> {
  return apiFetch('/api/stripe/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

export function changeTier(tier: string): Promise<{
  success: boolean;
  direction: 'upgrade' | 'downgrade';
  pendingTier?: string | null;
  effectiveAt?: string | null;
}> {
  return apiFetch('/api/stripe/change-tier', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

export function cancelDowngrade(): Promise<{ success: boolean }> {
  return apiFetch('/api/stripe/cancel-downgrade', { method: 'POST' });
}

export function getDowngradeWarnings(tier: string): Promise<{ warnings: string[] }> {
  return apiFetch(`/api/stripe/downgrade-warnings?tier=${tier}`);
}
