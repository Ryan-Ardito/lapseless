import { apiFetch } from './client';

const API_URL = import.meta.env.VITE_API_URL as string;

// --- Challenge endpoints (use raw fetch to avoid 401 redirect) ---

export async function verify2fa(code: string): Promise<{ redirect: string }> {
  const res = await fetch(`${API_URL}/auth/2fa/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Verification failed (${res.status})`);
  }
  return res.json();
}

export async function resend2fa(): Promise<void> {
  const res = await fetch(`${API_URL}/auth/2fa/resend`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Resend failed (${res.status})`);
  }
}

// --- Setup endpoints (authenticated, use apiFetch) ---

export interface TwoFactorStatus {
  twoFactorEnabled: boolean;
  phoneVerified: boolean;
  phone: string | null;
}

export function get2faStatus(): Promise<TwoFactorStatus> {
  return apiFetch('/api/2fa/status');
}

export function sendSetupCode(phone: string): Promise<{ ok: boolean }> {
  return apiFetch('/api/2fa/setup/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifySetupPhone(code: string, phone: string): Promise<{ ok: boolean }> {
  return apiFetch('/api/2fa/setup/verify-phone', {
    method: 'POST',
    body: JSON.stringify({ code, phone }),
  });
}

export function disable2fa(): Promise<{ ok: boolean }> {
  return apiFetch('/api/2fa/disable', { method: 'POST' });
}

export function sendTestSms(): Promise<{ ok: boolean }> {
  return apiFetch('/api/notifications/test-sms', { method: 'POST' });
}
