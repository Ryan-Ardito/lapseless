import { apiFetch } from './client';

export interface SubscriptionStatus {
  tier: 'solo' | 'team' | 'growth' | 'scale';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  limits: {
    obligations: number | null;
    users: number;
    storageMB: number;
    smsPerMonth: number;
  };
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
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
