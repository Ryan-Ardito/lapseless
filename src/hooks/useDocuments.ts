import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentMeta } from '../types/obligation';
import * as api from '../api/documents';
import { queryKeys } from './queryKeys';
import { useHistory } from './useHistory';
import { showUndoToast } from '../utils/undoToast';
import { useOrgContext } from '../contexts/OrgContext';

export function useDocuments() {
  const qc = useQueryClient();
  const { record, undo } = useHistory();
  const { orgId } = useOrgContext();

  const { data: documents = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.documents(orgId),
    queryFn: () => api.getDocuments(orgId),
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
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<DocumentMeta, 'displayName' | 'obligationId'>> }) =>
      api.updateDocument(orgId, id, updates),
    onMutate: ({ id }) => {
      const docs = qc.getQueryData<DocumentMeta[]>(queryKeys.documents(orgId)) ?? [];
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
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId) });
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
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId) });
    },
  });

  const seedMutation = useMutation({
    mutationFn: (data: DocumentMeta[]) => api.seedDocuments(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId) });
    },
  });

  return {
    documents,
    isLoading,
    isError,
    error,
    refetch,
    addDocument: (doc: DocumentMeta) => addMutation.mutateAsync(doc),
    updateDocument: (id: string, updates: Partial<Pick<DocumentMeta, 'displayName' | 'obligationId'>>) =>
      updateMutation.mutateAsync({ id, updates }),
    removeDocument: (id: string) => removeMutation.mutateAsync(id),
    loadSeedData: (data: DocumentMeta[]) => seedMutation.mutateAsync(data),
  };
}
