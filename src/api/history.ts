import type { HistoryEntry } from '../types/history';
import * as mock from './mock/history';
import * as http from './http/history';
import { getAppMode } from '../contexts/AppModeContext';

export function getHistory(orgId: string): Promise<HistoryEntry[]> {
  return getAppMode() === 'demo' ? mock.getHistory() : http.getHistory(orgId);
}

export function addHistoryEntry(
  orgId: string,
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>,
): Promise<HistoryEntry> {
  return getAppMode() === 'demo' ? mock.addHistoryEntry(entry) : http.addHistoryEntry(orgId, entry);
}

export function updateHistoryEntry(
  orgId: string,
  id: string,
  updates: Partial<Pick<HistoryEntry, 'undone'>>,
): Promise<HistoryEntry> {
  return getAppMode() === 'demo' ? mock.updateHistoryEntry(id, updates) : http.updateHistoryEntry(orgId, id, updates);
}

export function clearHistory(orgId: string): Promise<void> {
  return getAppMode() === 'demo' ? mock.clearHistory() : http.clearHistory(orgId);
}
