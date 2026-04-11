import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Checklist, ChecklistItem, ChecklistType } from '../types/checklist';
import { createItemsFromTemplate } from '../utils/checklistTemplates';
import { useApi } from '../contexts/ApiContext';
import { queryKeys } from './queryKeys';
import { useHistory } from './useHistory';
import { showUndoToast } from '../utils/undoToast';
import { useOrgContext } from '../contexts/OrgContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { notify } from '../utils/notify';

export function useChecklists() {
  const api = useApi();
  const qc = useQueryClient();
  const { record, undo } = useHistory();
  const { orgId } = useOrgContext();
  const { viewAsUserId, isViewingAsOther } = useViewAs();

  const { data: checklists = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.checklists(orgId, viewAsUserId),
    queryFn: () => api.getChecklists(orgId, viewAsUserId),
  });

  const createMutation = useMutation({
    mutationFn: (data: Checklist) => api.createChecklist(orgId, data),
    onSuccess: (created) => {
      notify.success('Checklist created');
      record({
        entityType: 'checklist',
        entityId: created.id,
        entityName: created.title,
        action: 'create',
        before: null,
        after: created as unknown as Record<string, unknown>,
      });
      qc.invalidateQueries({ queryKey: queryKeys.checklists(orgId, viewAsUserId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Checklist> }) =>
      api.updateChecklist(orgId, id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklists(orgId, viewAsUserId) }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteChecklist(orgId, id),
    onSuccess: (deleted) => {
      const entry = {
        entityType: 'checklist' as const,
        entityId: deleted.id,
        entityName: deleted.title,
        action: 'delete' as const,
        before: deleted as unknown as Record<string, unknown>,
        after: null,
      };
      record(entry).then((recorded) => {
        showUndoToast(`"${deleted.title}" deleted`, () => undo(recorded));
      });
      qc.invalidateQueries({ queryKey: queryKeys.checklists(orgId, viewAsUserId) });
    },
  });

  const seedMutation = useMutation({
    mutationFn: (data: Checklist[]) => api.seedChecklists(orgId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklists(orgId, viewAsUserId) }),
  });

  const createFromTemplate = (type: ChecklistType, period: string, title?: string): Checklist | undefined => {
    if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
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

  const createFromCustomTemplate = (templateItems: string[], period: string, title: string): Checklist | undefined => {
    if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
    const checklist: Checklist = {
      id: crypto.randomUUID(),
      type: 'custom',
      title,
      period,
      items: templateItems.map((label) => ({
        id: crypto.randomUUID(),
        label,
        completed: false,
      })),
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

  const completeChecklist = (id: string) =>
    updateMutation.mutateAsync({ id, updates: { completedAt: new Date().toISOString() } });

  const uncompleteChecklist = (id: string) =>
    updateMutation.mutateAsync({ id, updates: { completedAt: null } });

  return {
    checklists,
    isLoading,
    isError,
    error,
    refetch,
    createFromTemplate,
    createFromCustomTemplate,
    deleteChecklist: (id: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return deleteMutation.mutateAsync(id);
    },
    toggleItem: (checklistId: string, itemId: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      toggleItem(checklistId, itemId);
    },
    addItem: (checklistId: string, label: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      addItem(checklistId, label);
    },
    removeItem: (checklistId: string, itemId: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      removeItem(checklistId, itemId);
    },
    updateItem: (checklistId: string, itemId: string, updates: Partial<Omit<ChecklistItem, 'id'>>) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      updateItem(checklistId, itemId, updates);
    },
    completeChecklist: (id: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return completeChecklist(id);
    },
    uncompleteChecklist: (id: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return uncompleteChecklist(id);
    },
    loadSeedData: (data: Checklist[]) => seedMutation.mutateAsync(data),
  };
}
