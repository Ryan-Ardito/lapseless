import { apiFetch } from './client';

const API_URL = import.meta.env.VITE_API_URL as string;

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  tier: string;
  orgs: { id: string; name: string; role: string }[];
  pendingInviteCount: number;
}

export function getMe(): Promise<MeResponse> {
  return apiFetch('/auth/me');
}

export function logout(): Promise<void> {
  return apiFetch('/auth/logout', { method: 'POST' });
}

export function getLoginUrl(redirect?: string): string {
  const base = `${API_URL}/auth/google`;
  if (redirect) return `${base}?redirect=${encodeURIComponent(redirect)}`;
  return base;
}
