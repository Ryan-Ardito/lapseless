import type { Checklist } from '../types/checklist';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'lapseless-checklists';

export function getChecklists(): Promise<Checklist[]> {
  return simulateAsync(() => getItem<Checklist[]>(KEY, []));
}

export function createChecklist(data: Checklist): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(KEY, []);
    setItem(KEY, [data, ...checklists]);
    return data;
  });
}

export function updateChecklist(
  id: string,
  updates: Partial<Checklist>,
): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(KEY, []);
    const updated = checklists.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setItem(KEY, updated);
    return updated.find((c) => c.id === id)!;
  });
}

export function deleteChecklist(id: string): Promise<void> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(KEY, []);
    setItem(KEY, checklists.filter((c) => c.id !== id));
  });
}

export function seedChecklists(data: Checklist[]): Promise<Checklist[]> {
  return simulateAsync(() => {
    setItem(KEY, data);
    return data;
  });
}
