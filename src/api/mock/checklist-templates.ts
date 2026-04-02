import type { ChecklistTemplate } from '../../types/checklist';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'practiceatlas-checklist-templates';

export function getChecklistTemplates(): Promise<ChecklistTemplate[]> {
  return simulateAsync(() => getItem<ChecklistTemplate[]>(KEY, []));
}

export function createChecklistTemplate(
  data: { name: string; items: string[]; isOrg?: boolean },
): Promise<ChecklistTemplate> {
  return simulateAsync(() => {
    const templates = getItem<ChecklistTemplate[]>(KEY, []);
    const template: ChecklistTemplate = {
      id: crypto.randomUUID(),
      name: data.name,
      items: data.items,
      isOrg: data.isOrg ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItem(KEY, [template, ...templates]);
    return template;
  });
}

export function updateChecklistTemplate(
  id: string,
  updates: { name?: string; items?: string[] },
): Promise<ChecklistTemplate> {
  return simulateAsync(() => {
    const templates = getItem<ChecklistTemplate[]>(KEY, []);
    const updated = templates.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
    );
    setItem(KEY, updated);
    return updated.find((t) => t.id === id)!;
  });
}

export function deleteChecklistTemplate(id: string): Promise<void> {
  return simulateAsync(() => {
    const templates = getItem<ChecklistTemplate[]>(KEY, []);
    setItem(KEY, templates.filter((t) => t.id !== id));
  });
}

export function createTemplateFromChecklist(
  _checklistId: string,
  data: { name: string; items: string[]; isOrg?: boolean },
): Promise<ChecklistTemplate> {
  return createChecklistTemplate(data);
}
