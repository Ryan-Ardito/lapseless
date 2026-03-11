import { useCallback } from 'react';
import type { Checklist, ChecklistItem, ChecklistType } from '../types/checklist';
import { createItemsFromTemplate } from '../utils/checklistTemplates';
import { useLocalStorage } from './useLocalStorage';

export function useChecklists() {
  const [checklists, setChecklists] = useLocalStorage<Checklist[]>('lapseless-checklists', []);

  const createFromTemplate = useCallback(
    (type: ChecklistType, period: string, title?: string) => {
      const items = type === 'custom' ? [] : createItemsFromTemplate(type);
      const checklist: Checklist = {
        id: crypto.randomUUID(),
        type,
        title: title ?? (type === 'end-of-month' ? 'End of Month' : type === 'end-of-year' ? 'End of Year / Tax' : 'Custom Checklist'),
        period,
        items,
        createdAt: new Date().toISOString(),
      };
      setChecklists((prev) => [checklist, ...prev]);
      return checklist;
    },
    [setChecklists],
  );

  const deleteChecklist = useCallback(
    (id: string) => {
      setChecklists((prev) => prev.filter((c) => c.id !== id));
    },
    [setChecklists],
  );

  const toggleItem = useCallback(
    (checklistId: string, itemId: string) => {
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId
            ? {
                ...c,
                items: c.items.map((item) =>
                  item.id === itemId ? { ...item, completed: !item.completed } : item,
                ),
              }
            : c,
        ),
      );
    },
    [setChecklists],
  );

  const addItem = useCallback(
    (checklistId: string, label: string) => {
      const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        label,
        completed: false,
      };
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId ? { ...c, items: [...c.items, newItem] } : c,
        ),
      );
    },
    [setChecklists],
  );

  const removeItem = useCallback(
    (checklistId: string, itemId: string) => {
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId
            ? { ...c, items: c.items.filter((item) => item.id !== itemId) }
            : c,
        ),
      );
    },
    [setChecklists],
  );

  const updateItem = useCallback(
    (checklistId: string, itemId: string, updates: Partial<Omit<ChecklistItem, 'id'>>) => {
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId
            ? {
                ...c,
                items: c.items.map((item) =>
                  item.id === itemId ? { ...item, ...updates } : item,
                ),
              }
            : c,
        ),
      );
    },
    [setChecklists],
  );

  const loadSeedData = useCallback(
    (seed: Checklist[]) => {
      setChecklists(seed);
    },
    [setChecklists],
  );

  return {
    checklists,
    createFromTemplate,
    deleteChecklist,
    toggleItem,
    addItem,
    removeItem,
    updateItem,
    loadSeedData,
  };
}
