import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HistoryEntry, EntityType, HistoryAction } from '../types/history';
import * as historyApi from '../api/history';
import * as obligationApi from '../api/obligations';
import * as checklistApi from '../api/checklists';
import * as ptoApi from '../api/pto';
import * as documentApi from '../api/documents';
import { queryKeys } from './queryKeys';

export function useHistory() {
  const qc = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: queryKeys.history,
    queryFn: historyApi.getHistory,
  });

  const recordMutation = useMutation({
    mutationFn: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) =>
      historyApi.addHistoryEntry(entry),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.history }),
  });

  const undoMutation = useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      switch (entry.action) {
        case 'create':
          await softDelete(entry.entityType, entry.entityId);
          break;
        case 'delete':
          await restore(entry.entityType, entry.entityId);
          break;
        case 'update':
          await overwrite(entry.entityType, entry.entityId, entry.before!);
          break;
        case 'complete':
          await obligationApi.updateObligation(entry.entityId, { completed: false });
          if (entry.renewedId) {
            await obligationApi.deleteObligation(entry.renewedId);
          }
          break;
        case 'uncomplete':
          await obligationApi.updateObligation(entry.entityId, { completed: true });
          break;
      }
      await historyApi.updateHistoryEntry(entry.id, { undone: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.history });
      qc.invalidateQueries({ queryKey: queryKeys.obligations });
      qc.invalidateQueries({ queryKey: queryKeys.checklists });
      qc.invalidateQueries({ queryKey: queryKeys.ptoEntries });
      qc.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const redoMutation = useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      switch (entry.action) {
        case 'create':
          await restore(entry.entityType, entry.entityId);
          break;
        case 'delete':
          await softDelete(entry.entityType, entry.entityId);
          break;
        case 'update':
          await overwrite(entry.entityType, entry.entityId, entry.after!);
          break;
        case 'complete':
          await obligationApi.updateObligation(entry.entityId, { completed: true });
          if (entry.renewedId) {
            await obligationApi.restoreObligation(entry.renewedId);
          }
          break;
        case 'uncomplete':
          await obligationApi.updateObligation(entry.entityId, { completed: false });
          break;
      }
      await historyApi.updateHistoryEntry(entry.id, { undone: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.history });
      qc.invalidateQueries({ queryKey: queryKeys.obligations });
      qc.invalidateQueries({ queryKey: queryKeys.checklists });
      qc.invalidateQueries({ queryKey: queryKeys.ptoEntries });
      qc.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const clearMutation = useMutation({
    mutationFn: historyApi.clearHistory,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.history }),
  });

  return {
    history,
    isLoading,
    record: (params: {
      entityType: EntityType;
      entityId: string;
      entityName: string;
      action: HistoryAction;
      before: Record<string, unknown> | null;
      after: Record<string, unknown> | null;
      renewedId?: string;
    }) => recordMutation.mutateAsync(params),
    undo: (entry: HistoryEntry) => undoMutation.mutateAsync(entry),
    redo: (entry: HistoryEntry) => redoMutation.mutateAsync(entry),
    clearHistory: () => clearMutation.mutateAsync(),
  };
}

async function softDelete(entityType: EntityType, entityId: string) {
  switch (entityType) {
    case 'obligation':
      return obligationApi.deleteObligation(entityId);
    case 'checklist':
      return checklistApi.deleteChecklist(entityId);
    case 'pto-entry':
      return ptoApi.deletePTOEntry(entityId);
    case 'document':
      return documentApi.removeDocument(entityId);
  }
}

async function restore(entityType: EntityType, entityId: string) {
  switch (entityType) {
    case 'obligation':
      return obligationApi.restoreObligation(entityId);
    case 'checklist':
      return checklistApi.restoreChecklist(entityId);
    case 'pto-entry':
      return ptoApi.restorePTOEntry(entityId);
    case 'document':
      return documentApi.restoreDocument(entityId);
  }
}

async function overwrite(
  entityType: EntityType,
  entityId: string,
  snapshot: Record<string, unknown>,
) {
  switch (entityType) {
    case 'obligation':
      return obligationApi.updateObligation(entityId, snapshot);
    case 'checklist':
      return checklistApi.updateChecklist(entityId, snapshot);
    case 'pto-entry':
      return ptoApi.updatePTOEntry(entityId, snapshot);
    case 'document':
      return documentApi.updateDocument(entityId, snapshot as { displayName?: string });
  }
}
