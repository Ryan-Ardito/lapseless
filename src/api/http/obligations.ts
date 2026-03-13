import type { Obligation } from '../../types/obligation';
import { apiFetch } from './client';

export function getObligations(): Promise<Obligation[]> {
  return apiFetch('/api/obligations');
}

export function createObligation(
  data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>,
): Promise<Obligation> {
  return apiFetch('/api/obligations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateObligation(
  id: string,
  updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>,
): Promise<Obligation> {
  return apiFetch(`/api/obligations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteObligation(id: string): Promise<Obligation> {
  return apiFetch(`/api/obligations/${id}`, { method: 'DELETE' });
}

export function restoreObligation(id: string): Promise<Obligation> {
  return apiFetch(`/api/obligations/${id}/restore`, { method: 'POST' });
}

export function toggleObligationComplete(
  id: string,
): Promise<{ updated: Obligation; renewed?: Obligation }> {
  return apiFetch(`/api/obligations/${id}/toggle`, { method: 'POST' });
}

export function seedObligations(_data: Obligation[]): Promise<Obligation[]> {
  // No-op in HTTP mode — demo-only feature
  return Promise.resolve([]);
}
