import type { ChecklistTemplate } from '../../types/checklist';
import { getItem, setItem, simulateAsync } from './client';

const key = (orgId: string) => `practiceatlas-${orgId}-checklist-templates`;

export function getChecklistTemplates(orgId: string): Promise<ChecklistTemplate[]> {
  return simulateAsync(() => getItem<ChecklistTemplate[]>(key(orgId), []));
}

export function createChecklistTemplate(
  orgId: string,
  data: { name: string; items: string[]; isOrg?: boolean },
): Promise<ChecklistTemplate> {
  return simulateAsync(() => {
    const templates = getItem<ChecklistTemplate[]>(key(orgId), []);
    const template: ChecklistTemplate = {
      id: crypto.randomUUID(),
      name: data.name,
      items: data.items,
      isOrg: data.isOrg ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItem(key(orgId), [template, ...templates]);
    return template;
  });
}

export function updateChecklistTemplate(
  orgId: string,
  id: string,
  updates: { name?: string; items?: string[] },
): Promise<ChecklistTemplate> {
  return simulateAsync(() => {
    const templates = getItem<ChecklistTemplate[]>(key(orgId), []);
    const updated = templates.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
    );
    setItem(key(orgId), updated);
    return updated.find((t) => t.id === id)!;
  });
}

export function deleteChecklistTemplate(orgId: string, id: string): Promise<void> {
  return simulateAsync(() => {
    const templates = getItem<ChecklistTemplate[]>(key(orgId), []);
    setItem(key(orgId), templates.filter((t) => t.id !== id));
  });
}

export function createTemplateFromChecklist(
  orgId: string,
  _checklistId: string,
  data: { name: string; items: string[]; isOrg?: boolean },
): Promise<ChecklistTemplate> {
  return createChecklistTemplate(orgId, data);
}
