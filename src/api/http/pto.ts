import type { PTOEntry, PTOConfig } from '../../types/pto';
import { apiFetch } from './client';

export function getPTOEntries(year?: number): Promise<PTOEntry[]> {
  const qs = year != null ? `?year=${year}` : '';
  return apiFetch(`/api/pto/entries${qs}`);
}

export function getPTOConfig(year?: number): Promise<PTOConfig> {
  const qs = year != null ? `?year=${year}` : '';
  return apiFetch(`/api/pto/config${qs}`);
}

export function createPTOEntry(
  data: Omit<PTOEntry, 'id' | 'createdAt'>,
): Promise<PTOEntry> {
  return apiFetch('/api/pto/entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePTOEntry(
  id: string,
  updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>,
): Promise<PTOEntry> {
  return apiFetch(`/api/pto/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deletePTOEntry(id: string): Promise<PTOEntry> {
  return apiFetch(`/api/pto/entries/${id}`, { method: 'DELETE' });
}

export function restorePTOEntry(id: string): Promise<PTOEntry> {
  return apiFetch(`/api/pto/entries/${id}/restore`, { method: 'POST' });
}

export function updatePTOConfig(updates: Partial<PTOConfig>): Promise<PTOConfig> {
  return apiFetch('/api/pto/config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function seedPTOEntries(_data: PTOEntry[]): Promise<PTOEntry[]> {
  return Promise.resolve([]);
}
