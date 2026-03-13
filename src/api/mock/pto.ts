import type { PTOEntry, PTOConfig } from '../../types/pto';
import { getItem, setItem, simulateAsync } from './client';

const ENTRIES_KEY = 'lapseless-pto';
const CONFIG_KEY = 'lapseless-pto-config';

const currentYear = new Date().getFullYear();
const defaultConfig: PTOConfig = { yearlyAllowance: 160, year: currentYear };

export function getPTOEntries(): Promise<PTOEntry[]> {
  return simulateAsync(() => getItem<PTOEntry[]>(ENTRIES_KEY, []).filter((e) => !e.deletedAt));
}

export function getPTOConfig(): Promise<PTOConfig> {
  return simulateAsync(() => getItem<PTOConfig>(CONFIG_KEY, defaultConfig));
}

export function createPTOEntry(
  data: Omit<PTOEntry, 'id' | 'createdAt'>,
): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(ENTRIES_KEY, []);
    const newEntry: PTOEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setItem(ENTRIES_KEY, [...entries, newEntry]);
    return newEntry;
  });
}

export function updatePTOEntry(
  id: string,
  updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>,
): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(ENTRIES_KEY, []);
    const updated = entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setItem(ENTRIES_KEY, updated);
    return updated.find((e) => e.id === id)!;
  });
}

export function deletePTOEntry(id: string): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(ENTRIES_KEY, []);
    const target = entries.find((e) => e.id === id);
    if (!target) throw new Error(`PTO entry ${id} not found`);
    const deletedAt = new Date().toISOString();
    setItem(ENTRIES_KEY, entries.map((e) => (e.id === id ? { ...e, deletedAt } : e)));
    return { ...target, deletedAt };
  });
}

export function restorePTOEntry(id: string): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(ENTRIES_KEY, []);
    const updated = entries.map((e) =>
      e.id === id ? { ...e, deletedAt: undefined } : e,
    );
    setItem(ENTRIES_KEY, updated);
    return updated.find((e) => e.id === id)!;
  });
}

export function updatePTOConfig(updates: Partial<PTOConfig>): Promise<PTOConfig> {
  return simulateAsync(() => {
    const config = getItem<PTOConfig>(CONFIG_KEY, defaultConfig);
    const updated = { ...config, ...updates };
    setItem(CONFIG_KEY, updated);
    return updated;
  });
}

export function seedPTOEntries(data: PTOEntry[]): Promise<PTOEntry[]> {
  return simulateAsync(() => {
    setItem(ENTRIES_KEY, data);
    return data;
  });
}
