import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentMeta } from '../types/obligation';
import { useApi } from '../contexts/ApiContext';
import { queryKeys } from './queryKeys';
import { useHistory } from './useHistory';
import { showUndoToast } from '../utils/undoToast';
import { notify } from '../utils/notify';
import { useOrgContext } from '../contexts/OrgContext';
import { useViewAs } from '../contexts/ViewAsContext';

export function useDocuments() {
  const api = useApi();
  const qc = useQueryClient();
  const { record, undo } = useHistory();
  const { orgId } = useOrgContext();
  const { viewAsUserId, isViewingAsOther } = useViewAs();

  const { data: documents = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.documents(orgId, viewAsUserId),
    queryFn: () => api.getDocuments(orgId, viewAsUserId),
  });

  const addMutation = useMutation({
    mutationFn: (doc: DocumentMeta) => api.addDocument(orgId, doc),
    onSuccess: (created) => {
      record({
        entityType: 'document',
        entityId: created.id,
        entityName: created.displayName || created.name,
        action: 'create',
        before: null,
        after: created as unknown as Record<string, unknown>,
      });
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<DocumentMeta, 'displayName' | 'obligationId'>> }) =>
      api.updateDocument(orgId, id, updates),
    onMutate: ({ id }) => {
      const docs = qc.getQueryData<DocumentMeta[]>(queryKeys.documents(orgId, viewAsUserId)) ?? [];
      return { before: docs.find((d) => d.id === id) };
    },
    onSuccess: (updated, _vars, context) => {
      if (context?.before) {
        record({
          entityType: 'document',
          entityId: updated.id,
          entityName: updated.displayName || updated.name,
          action: 'update',
          before: context.before as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.removeDocument(orgId, id),
    onSuccess: (deleted) => {
      const entry = {
        entityType: 'document' as const,
        entityId: deleted.id,
        entityName: deleted.displayName || deleted.name,
        action: 'delete' as const,
        before: deleted as unknown as Record<string, unknown>,
        after: null,
      };
      record(entry).then((recorded) => {
        showUndoToast(`"${deleted.displayName || deleted.name}" deleted`, () => undo(recorded));
      });
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  const seedMutation = useMutation({
    mutationFn: (data: DocumentMeta[]) => api.seedDocuments(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId, viewAsUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  return {
    documents,
    isLoading,
    isError,
    error,
    refetch,
    addDocument: (doc: DocumentMeta) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return addMutation.mutateAsync(doc);
    },
    updateDocument: (id: string, updates: Partial<Pick<DocumentMeta, 'displayName' | 'obligationId'>>) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return updateMutation.mutateAsync({ id, updates });
    },
    removeDocument: (id: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return removeMutation.mutateAsync(id);
    },
    loadSeedData: (data: DocumentMeta[]) => seedMutation.mutateAsync(data),
  };
}
