import type { PTOEntry, PTOConfig } from '../../types/pto';
import { getItem, setItem, simulateAsync } from './client';

const entriesKey = (orgId: string) => `practiceatlas-${orgId}-pto`;
const configKey = (orgId: string) => `practiceatlas-${orgId}-pto-config`;
const orgConfigKey = (orgId: string) => `practiceatlas-${orgId}-pto-org-config`;

const currentYear = new Date().getFullYear();
const defaultConfig: PTOConfig = { yearlyAllowance: 160, year: currentYear };
const defaultOrgConfig = { defaultYearlyAllowance: 160 };

function migrateEntry(e: any): PTOEntry {
  if (e.date && !e.startDate) {
    const { date, ...rest } = e;
    return { ...rest, startDate: date, endDate: date };
  }
  return e;
}

export function getPTOEntries(orgId: string, _year?: number, _userId?: string): Promise<PTOEntry[]> {
  return simulateAsync(() => getItem<any[]>(entriesKey(orgId), []).map(migrateEntry).filter((e) => !e.deletedAt));
}

export function getPTOConfig(orgId: string, _year?: number, _userId?: string): Promise<PTOConfig> {
  return simulateAsync(() => getItem<PTOConfig>(configKey(orgId), defaultConfig));
}

export function createPTOEntry(
  orgId: string,
  data: Omit<PTOEntry, 'id' | 'createdAt'>,
  _targetUserId?: string,
): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(entriesKey(orgId), []);
    const newEntry: PTOEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setItem(entriesKey(orgId), [...entries, newEntry]);
    return newEntry;
  });
}

export function updatePTOEntry(
  orgId: string,
  id: string,
  updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>,
): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(entriesKey(orgId), []);
    const updated = entries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setItem(entriesKey(orgId), updated);
    return updated.find((e) => e.id === id)!;
  });
}

export function deletePTOEntry(orgId: string, id: string): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(entriesKey(orgId), []);
    const target = entries.find((e) => e.id === id);
    if (!target) throw new Error(`PTO entry ${id} not found`);
    const deletedAt = new Date().toISOString();
    setItem(entriesKey(orgId), entries.map((e) => (e.id === id ? { ...e, deletedAt } : e)));
    return { ...target, deletedAt };
  });
}

export function restorePTOEntry(orgId: string, id: string): Promise<PTOEntry> {
  return simulateAsync(() => {
    const entries = getItem<PTOEntry[]>(entriesKey(orgId), []);
    const updated = entries.map((e) =>
      e.id === id ? { ...e, deletedAt: undefined } : e,
    );
    setItem(entriesKey(orgId), updated);
    return updated.find((e) => e.id === id)!;
  });
}

export function updatePTOConfig(orgId: string, updates: Partial<PTOConfig>, _targetUserId?: string): Promise<PTOConfig> {
  return simulateAsync(() => {
    const config = getItem<PTOConfig>(configKey(orgId), defaultConfig);
    const updated = { ...config, ...updates };
    setItem(configKey(orgId), updated);
    return updated;
  });
}

export function getOrgPTOConfig(orgId: string): Promise<{ defaultYearlyAllowance: number }> {
  return simulateAsync(() => getItem(orgConfigKey(orgId), defaultOrgConfig));
}

export function updateOrgPTOConfig(orgId: string, defaultYearlyAllowance: number): Promise<{ defaultYearlyAllowance: number }> {
  return simulateAsync(() => {
    const updated = { defaultYearlyAllowance };
    setItem(orgConfigKey(orgId), updated);
    return updated;
  });
}

export function seedPTOEntries(orgId: string, data: PTOEntry[]): Promise<PTOEntry[]> {
  return simulateAsync(() => {
    setItem(entriesKey(orgId), data);
    return data;
  });
}
