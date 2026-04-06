import type { PTOEntry, PTOConfig } from '../../types/pto';
import { apiFetch } from './client';

export function getPTOEntries(orgId: string, year?: number, userId?: string): Promise<PTOEntry[]> {
  const params = new URLSearchParams();
  if (year != null) params.set('year', String(year));
  if (userId) params.set('userId', userId);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch(`/api/orgs/${orgId}/pto/entries${qs}`);
}

export function getPTOConfig(orgId: string, year?: number, userId?: string): Promise<PTOConfig> {
  const params = new URLSearchParams();
  if (year != null) params.set('year', String(year));
  if (userId) params.set('userId', userId);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch(`/api/orgs/${orgId}/pto/config${qs}`);
}

export function createPTOEntry(
  orgId: string,
  data: Omit<PTOEntry, 'id' | 'createdAt'>,
  targetUserId?: string,
): Promise<PTOEntry> {
  return apiFetch(`/api/orgs/${orgId}/pto/entries`, {
    method: 'POST',
    body: JSON.stringify(targetUserId ? { ...data, targetUserId } : data),
  });
}

export function updatePTOEntry(
  orgId: string,
  id: string,
  updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>,
): Promise<PTOEntry> {
  return apiFetch(`/api/orgs/${orgId}/pto/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deletePTOEntry(orgId: string, id: string): Promise<PTOEntry> {
  return apiFetch(`/api/orgs/${orgId}/pto/entries/${id}`, { method: 'DELETE' });
}

export function restorePTOEntry(orgId: string, id: string): Promise<PTOEntry> {
  return apiFetch(`/api/orgs/${orgId}/pto/entries/${id}/restore`, { method: 'POST' });
}

export function updatePTOConfig(orgId: string, updates: Partial<PTOConfig>, targetUserId?: string): Promise<PTOConfig> {
  return apiFetch(`/api/orgs/${orgId}/pto/config`, {
    method: 'PATCH',
    body: JSON.stringify(targetUserId ? { ...updates, userId: targetUserId } : updates),
  });
}

export function seedPTOEntries(_orgId: string, _data: PTOEntry[]): Promise<PTOEntry[]> {
  return Promise.resolve([]);
}
