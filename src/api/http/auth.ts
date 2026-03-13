import { apiFetch } from './client';

const API_URL = import.meta.env.VITE_API_URL as string;

export function getMe(): Promise<{ id: string; email: string; name: string }> {
  return apiFetch('/auth/me');
}

export function logout(): Promise<void> {
  return apiFetch('/auth/logout', { method: 'POST' });
}

export function getLoginUrl(): string {
  return `${API_URL}/auth/google`;
}
