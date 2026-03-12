import type { HistoryEntry } from '../types/history';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'lapseless-history';
const MAX_ENTRIES = 200;

export function getHistory(): Promise<HistoryEntry[]> {
  return simulateAsync(() => getItem<HistoryEntry[]>(KEY, []));
}

export function addHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>,
): Promise<HistoryEntry> {
  return simulateAsync(() => {
    const history = getItem<HistoryEntry[]>(KEY, []);
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, MAX_ENTRIES);
    setItem(KEY, updated);
    return newEntry;
  });
}

export function updateHistoryEntry(
  id: string,
  updates: Partial<Pick<HistoryEntry, 'undone'>>,
): Promise<HistoryEntry> {
  return simulateAsync(() => {
    const history = getItem<HistoryEntry[]>(KEY, []);
    const updated = history.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setItem(KEY, updated);
    return updated.find((e) => e.id === id)!;
  });
}

export function clearHistory(): Promise<void> {
  return simulateAsync(() => {
    setItem(KEY, []);
  });
}
