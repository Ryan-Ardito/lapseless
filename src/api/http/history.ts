import type { HistoryEntry } from '../../types/history';
import { apiFetch } from './client';

export function getHistory(orgId: string): Promise<HistoryEntry[]> {
  return apiFetch(`/api/orgs/${orgId}/history`);
}

export function addHistoryEntry(
  orgId: string,
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>,
): Promise<HistoryEntry> {
  return apiFetch(`/api/orgs/${orgId}/history`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export function updateHistoryEntry(
  orgId: string,
  id: string,
  updates: Partial<Pick<HistoryEntry, 'undone'>>,
): Promise<HistoryEntry> {
  return apiFetch(`/api/orgs/${orgId}/history/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function clearHistory(orgId: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/history`, { method: 'DELETE' });
}
