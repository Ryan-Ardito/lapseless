import type { PTOEntry, PTOConfig } from '../../types/pto';
import { apiFetch } from './client';

export function getPTOEntries(): Promise<PTOEntry[]> {
  return apiFetch('/api/pto/entries');
}

export function getPTOConfig(): Promise<PTOConfig> {
  return apiFetch('/api/pto/config');
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
