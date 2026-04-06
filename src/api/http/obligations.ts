import type { Obligation } from '../../types/obligation';
import { apiFetch } from './client';

export function getObligations(orgId: string, userId?: string): Promise<Obligation[]> {
  const qs = userId ? `?userId=${userId}` : '';
  return apiFetch(`/api/orgs/${orgId}/obligations${qs}`);
}

export function createObligation(
  orgId: string,
  data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>,
  targetUserId?: string,
): Promise<Obligation> {
  return apiFetch(`/api/orgs/${orgId}/obligations`, {
    method: 'POST',
    body: JSON.stringify(targetUserId ? { ...data, targetUserId } : data),
  });
}

export function updateObligation(
  orgId: string,
  id: string,
  updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>,
): Promise<Obligation> {
  return apiFetch(`/api/orgs/${orgId}/obligations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteObligation(orgId: string, id: string): Promise<Obligation> {
  return apiFetch(`/api/orgs/${orgId}/obligations/${id}`, { method: 'DELETE' });
}

export function restoreObligation(orgId: string, id: string): Promise<Obligation> {
  return apiFetch(`/api/orgs/${orgId}/obligations/${id}/restore`, { method: 'POST' });
}

export function toggleObligationComplete(
  orgId: string,
  id: string,
): Promise<{ updated: Obligation; renewed?: Obligation }> {
  return apiFetch(`/api/orgs/${orgId}/obligations/${id}/toggle`, { method: 'POST' });
}

export function seedObligations(_orgId: string, _data: Obligation[]): Promise<Obligation[]> {
  // No-op in HTTP mode — demo-only feature
  return Promise.resolve([]);
}
