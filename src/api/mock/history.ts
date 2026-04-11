import type { HistoryEntry } from '../../types/history';
import { getItem, setItem, simulateAsync } from './client';

const key = (orgId: string) => `practiceatlas-${orgId}-history`;
const MAX_ENTRIES = 200;

export function getHistory(orgId: string, _userId?: string): Promise<HistoryEntry[]> {
  return simulateAsync(() => getItem<HistoryEntry[]>(key(orgId), []));
}

export function addHistoryEntry(
  orgId: string,
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>,
): Promise<HistoryEntry> {
  return simulateAsync(() => {
    const history = getItem<HistoryEntry[]>(key(orgId), []);
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, MAX_ENTRIES);
    setItem(key(orgId), updated);
    return newEntry;
  });
}

export function updateHistoryEntry(
  orgId: string,
  id: string,
  updates: Partial<Pick<HistoryEntry, 'undone'>>,
): Promise<HistoryEntry> {
  return simulateAsync(() => {
    const history = getItem<HistoryEntry[]>(key(orgId), []);
    const updated = history.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setItem(key(orgId), updated);
    return updated.find((e) => e.id === id)!;
  });
}

export function clearHistory(orgId: string): Promise<void> {
  return simulateAsync(() => {
    setItem(key(orgId), []);
  });
}
