import { apiFetch } from './client';
import type { Tier } from '../../lib/plan-display';

export interface SubscriptionStatus {
  tier: Tier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  limits: {
    obligations: number | null;
    seatsPerOrg: number;
    storageMB: number;
    smsPerMonth: number;
    maxOrgs: number;
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
  isOwner?: boolean;
}

export function getSubscriptionStatus(orgId: string): Promise<SubscriptionStatus> {
  return apiFetch(`/api/stripe/status?orgId=${orgId}`);
}

export function getPortalUrl(orgId: string): Promise<{ url: string }> {
  return apiFetch(`/api/stripe/portal?orgId=${orgId}`);
}

export function createCheckout(tier: string, orgId?: string): Promise<{ url: string }> {
  return apiFetch('/api/stripe/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ tier, ...(orgId ? { orgId } : {}) }),
  });
}

export function changeTier(tier: string, orgId: string): Promise<{
  success: boolean;
  direction: 'upgrade' | 'downgrade';
  pendingTier?: string | null;
  effectiveAt?: string | null;
}> {
  return apiFetch('/api/stripe/change-tier', {
    method: 'POST',
    body: JSON.stringify({ tier, orgId }),
  });
}

export function cancelDowngrade(orgId: string): Promise<{ success: boolean }> {
  return apiFetch('/api/stripe/cancel-downgrade', {
    method: 'POST',
    body: JSON.stringify({ orgId }),
  });
}

export function getDowngradeWarnings(tier: string, orgId: string): Promise<{ warnings: string[] }> {
  return apiFetch(`/api/stripe/downgrade-warnings?tier=${tier}&orgId=${orgId}`);
}
