import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '../utils/notify';
import type { HistoryEntry, EntityType, HistoryAction } from '../types/history';
import { useApi, type ApiBackend } from '../contexts/ApiContext';
import { queryKeys } from './queryKeys';
import { useOrgContext } from '../contexts/OrgContext';
import { useViewAs } from '../contexts/ViewAsContext';

export function useHistory() {
  const api = useApi();
  const qc = useQueryClient();
  const { orgId } = useOrgContext();
  const { viewAsUserId, isViewingAsOther } = useViewAs();

  const { data: history = [], isLoading } = useQuery({
    queryKey: queryKeys.history(orgId, viewAsUserId),
    queryFn: () => api.getHistory(orgId, viewAsUserId),
  });

  const recordMutation = useMutation({
    mutationFn: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) =>
      api.addHistoryEntry(orgId, entry),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.history(orgId, viewAsUserId) }),
  });

  const undoMutation = useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      switch (entry.action) {
        case 'create':
          await softDelete(api, orgId, entry.entityType, entry.entityId);
          break;
        case 'delete':
          await restore(api, orgId, entry.entityType, entry.entityId);
          break;
        case 'update':
          await overwrite(api, orgId, entry.entityType, entry.entityId, entry.before!);
          break;
        case 'complete':
          await api.updateObligation(orgId, entry.entityId, { completed: false });
          if (entry.renewedId) {
            await api.deleteObligation(orgId, entry.renewedId);
          }
          break;
        case 'uncomplete':
          await api.updateObligation(orgId, entry.entityId, { completed: true });
          break;
      }
      await api.updateHistoryEntry(orgId, entry.id, { undone: true });
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
          await restore(api, orgId, entry.entityType, entry.entityId);
          break;
        case 'delete':
          await softDelete(api, orgId, entry.entityType, entry.entityId);
          break;
        case 'update':
          await overwrite(api, orgId, entry.entityType, entry.entityId, entry.after!);
          break;
        case 'complete':
          await api.updateObligation(orgId, entry.entityId, { completed: true });
          if (entry.renewedId) {
            await api.restoreObligation(orgId, entry.renewedId);
          }
          break;
        case 'uncomplete':
          await api.updateObligation(orgId, entry.entityId, { completed: false });
          break;
      }
      await api.updateHistoryEntry(orgId, entry.id, { undone: false });
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
    mutationFn: () => api.clearHistory(orgId),
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
    undo: (entry: HistoryEntry) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return undoMutation.mutateAsync(entry);
    },
    redo: (entry: HistoryEntry) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return redoMutation.mutateAsync(entry);
    },
    clearHistory: () => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return clearMutation.mutateAsync();
    },
  };
}

async function softDelete(backend: ApiBackend, orgId: string, entityType: EntityType, entityId: string) {
  switch (entityType) {
    case 'obligation':
      return backend.deleteObligation(orgId, entityId);
    case 'checklist':
      return backend.deleteChecklist(orgId, entityId);
    case 'pto-entry':
      return backend.deletePTOEntry(orgId, entityId);
    case 'document':
      return backend.removeDocument(orgId, entityId);
  }
}

async function restore(backend: ApiBackend, orgId: string, entityType: EntityType, entityId: string) {
  switch (entityType) {
    case 'obligation':
      return backend.restoreObligation(orgId, entityId);
    case 'checklist':
      return backend.restoreChecklist(orgId, entityId);
    case 'pto-entry':
      return backend.restorePTOEntry(orgId, entityId);
    case 'document':
      return backend.restoreDocument(orgId, entityId);
  }
}

async function overwrite(
  backend: ApiBackend,
  orgId: string,
  entityType: EntityType,
  entityId: string,
  snapshot: Record<string, unknown>,
) {
  switch (entityType) {
    case 'obligation':
      return backend.updateObligation(orgId, entityId, snapshot);
    case 'checklist':
      return backend.updateChecklist(orgId, entityId, snapshot);
    case 'pto-entry':
      return backend.updatePTOEntry(orgId, entityId, snapshot);
    case 'document':
      return backend.updateDocument(orgId, entityId, snapshot as { displayName?: string });
  }
}
