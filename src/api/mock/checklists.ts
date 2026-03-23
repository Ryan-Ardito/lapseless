import type { Checklist } from '../../types/checklist';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'practiceatlas-checklists';

export function getChecklists(): Promise<Checklist[]> {
  return simulateAsync(() => getItem<Checklist[]>(KEY, []).filter((c) => !c.deletedAt));
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

export function deleteChecklist(id: string): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(KEY, []);
    const target = checklists.find((c) => c.id === id);
    if (!target) throw new Error(`Checklist ${id} not found`);
    const deletedAt = new Date().toISOString();
    setItem(KEY, checklists.map((c) => (c.id === id ? { ...c, deletedAt } : c)));
    return { ...target, deletedAt };
  });
}

export function restoreChecklist(id: string): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(KEY, []);
    const updated = checklists.map((c) =>
      c.id === id ? { ...c, deletedAt: undefined } : c,
    );
    setItem(KEY, updated);
    return updated.find((c) => c.id === id)!;
  });
}

export function seedChecklists(data: Checklist[]): Promise<Checklist[]> {
  return simulateAsync(() => {
    setItem(KEY, data);
    return data;
  });
}
