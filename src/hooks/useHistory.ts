import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HistoryEntry, EntityType, HistoryAction } from '../types/history';
import * as historyApi from '../api/history';
import * as obligationApi from '../api/obligations';
import * as checklistApi from '../api/checklists';
import * as ptoApi from '../api/pto';
import * as documentApi from '../api/documents';
import { queryKeys } from './queryKeys';
import { useOrgContext } from '../contexts/OrgContext';
import { useViewAs } from '../contexts/ViewAsContext';

export function useHistory() {
  const qc = useQueryClient();
  const { orgId } = useOrgContext();
  const { viewAsUserId } = useViewAs();

  const { data: history = [], isLoading } = useQuery({
    queryKey: queryKeys.history(orgId, viewAsUserId),
    queryFn: () => historyApi.getHistory(orgId, viewAsUserId),
  });

  const recordMutation = useMutation({
    mutationFn: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) =>
      historyApi.addHistoryEntry(orgId, entry),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.history(orgId, viewAsUserId) }),
  });

  const undoMutation = useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      switch (entry.action) {
        case 'create':
          await softDelete(orgId, entry.entityType, entry.entityId);
          break;
        case 'delete':
          await restore(orgId, entry.entityType, entry.entityId);
          break;
        case 'update':
          await overwrite(orgId, entry.entityType, entry.entityId, entry.before!);
          break;
        case 'complete':
          await obligationApi.updateObligation(orgId, entry.entityId, { completed: false });
          if (entry.renewedId) {
            await obligationApi.deleteObligation(orgId, entry.renewedId);
          }
          break;
        case 'uncomplete':
          await obligationApi.updateObligation(orgId, entry.entityId, { completed: true });
          break;
      }
      await historyApi.updateHistoryEntry(orgId, entry.id, { undone: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.history(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.checklists(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.ptoEntries(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId, viewAsUserId) });
    },
  });

  const redoMutation = useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      switch (entry.action) {
        case 'create':
          await restore(orgId, entry.entityType, entry.entityId);
          break;
        case 'delete':
          await softDelete(orgId, entry.entityType, entry.entityId);
          break;
        case 'update':
          await overwrite(orgId, entry.entityType, entry.entityId, entry.after!);
          break;
        case 'complete':
          await obligationApi.updateObligation(orgId, entry.entityId, { completed: true });
          if (entry.renewedId) {
            await obligationApi.restoreObligation(orgId, entry.renewedId);
          }
          break;
        case 'uncomplete':
          await obligationApi.updateObligation(orgId, entry.entityId, { completed: false });
          break;
      }
      await historyApi.updateHistoryEntry(orgId, entry.id, { undone: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.history(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.checklists(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.ptoEntries(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId, viewAsUserId) });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => historyApi.clearHistory(orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.history(orgId, viewAsUserId) }),
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

async function softDelete(orgId: string, entityType: EntityType, entityId: string) {
  switch (entityType) {
    case 'obligation':
      return obligationApi.deleteObligation(orgId, entityId);
    case 'checklist':
      return checklistApi.deleteChecklist(orgId, entityId);
    case 'pto-entry':
      return ptoApi.deletePTOEntry(orgId, entityId);
    case 'document':
      return documentApi.removeDocument(orgId, entityId);
  }
}

async function restore(orgId: string, entityType: EntityType, entityId: string) {
  switch (entityType) {
    case 'obligation':
      return obligationApi.restoreObligation(orgId, entityId);
    case 'checklist':
      return checklistApi.restoreChecklist(orgId, entityId);
    case 'pto-entry':
      return ptoApi.restorePTOEntry(orgId, entityId);
    case 'document':
      return documentApi.restoreDocument(orgId, entityId);
  }
}

async function overwrite(
  orgId: string,
  entityType: EntityType,
  entityId: string,
  snapshot: Record<string, unknown>,
) {
  switch (entityType) {
    case 'obligation':
      return obligationApi.updateObligation(orgId, entityId, snapshot);
    case 'checklist':
      return checklistApi.updateChecklist(orgId, entityId, snapshot);
    case 'pto-entry':
      return ptoApi.updatePTOEntry(orgId, entityId, snapshot);
    case 'document':
      return documentApi.updateDocument(orgId, entityId, snapshot as { displayName?: string });
  }
}
