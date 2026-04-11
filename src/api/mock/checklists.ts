import type { Checklist } from '../../types/checklist';
import { getItem, setItem, simulateAsync } from './client';

const key = (orgId: string) => `practiceatlas-${orgId}-checklists`;

export function getChecklists(orgId: string, _userId?: string): Promise<Checklist[]> {
  return simulateAsync(() => getItem<Checklist[]>(key(orgId), []).filter((c) => !c.deletedAt));
}

export function createChecklist(orgId: string, data: Checklist, _targetUserId?: string): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(key(orgId), []);
    setItem(key(orgId), [data, ...checklists]);
    return data;
  });
}

export function updateChecklist(
  orgId: string,
  id: string,
  updates: Partial<Checklist>,
): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(key(orgId), []);
    const updated = checklists.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setItem(key(orgId), updated);
    return updated.find((c) => c.id === id)!;
  });
}

export function deleteChecklist(orgId: string, id: string): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(key(orgId), []);
    const target = checklists.find((c) => c.id === id);
    if (!target) throw new Error(`Checklist ${id} not found`);
    const deletedAt = new Date().toISOString();
    setItem(key(orgId), checklists.map((c) => (c.id === id ? { ...c, deletedAt } : c)));
    return { ...target, deletedAt };
  });
}

export function restoreChecklist(orgId: string, id: string): Promise<Checklist> {
  return simulateAsync(() => {
    const checklists = getItem<Checklist[]>(key(orgId), []);
    const updated = checklists.map((c) =>
      c.id === id ? { ...c, deletedAt: undefined } : c,
    );
    setItem(key(orgId), updated);
    return updated.find((c) => c.id === id)!;
  });
}

export function seedChecklists(orgId: string, data: Checklist[]): Promise<Checklist[]> {
  return simulateAsync(() => {
    setItem(key(orgId), data);
    return data;
  });
}
