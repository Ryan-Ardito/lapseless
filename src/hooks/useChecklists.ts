import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Checklist, ChecklistItem, ChecklistType } from '../types/checklist';
import { createItemsFromTemplate } from '../utils/checklistTemplates';
import * as api from '../api/checklists';
import { queryKeys } from './queryKeys';

export function useChecklists() {
  const qc = useQueryClient();

  const { data: checklists = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.checklists,
    queryFn: api.getChecklists,
  });

  const createMutation = useMutation({
    mutationFn: api.createChecklist,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklists }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Checklist> }) =>
      api.updateChecklist(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklists }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteChecklist,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklists }),
  });

  const seedMutation = useMutation({
    mutationFn: api.seedChecklists,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklists }),
  });

  const createFromTemplate = (type: ChecklistType, period: string, title?: string) => {
    const items = type === 'custom' ? [] : createItemsFromTemplate(type);
    const checklist: Checklist = {
      id: crypto.randomUUID(),
      type,
      title: title ?? (type === 'end-of-month' ? 'End of Month' : type === 'end-of-year' ? 'End of Year / Tax' : 'Custom Checklist'),
      period,
      items,
      createdAt: new Date().toISOString(),
    };
    createMutation.mutate(checklist);
    return checklist;
  };

  const toggleItem = (checklistId: string, itemId: string) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    const items = checklist.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    );
    updateMutation.mutate({ id: checklistId, updates: { items } });
  };

  const addItem = (checklistId: string, label: string) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      label,
      completed: false,
    };
    updateMutation.mutate({ id: checklistId, updates: { items: [...checklist.items, newItem] } });
  };

  const removeItem = (checklistId: string, itemId: string) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    updateMutation.mutate({
      id: checklistId,
      updates: { items: checklist.items.filter((item) => item.id !== itemId) },
    });
  };

  const updateItem = (checklistId: string, itemId: string, updates: Partial<Omit<ChecklistItem, 'id'>>) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    const items = checklist.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item,
    );
    updateMutation.mutate({ id: checklistId, updates: { items } });
  };

  return {
    checklists,
    isLoading,
    isError,
    error,
    refetch,
    createFromTemplate,
    deleteChecklist: (id: string) => deleteMutation.mutateAsync(id),
    toggleItem,
    addItem,
    removeItem,
    updateItem,
    loadSeedData: (data: Checklist[]) => seedMutation.mutateAsync(data),
  };
}
