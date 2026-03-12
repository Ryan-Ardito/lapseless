import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentMeta } from '../types/obligation';
import * as api from '../api/documents';
import { queryKeys } from './queryKeys';
import { useHistory } from './useHistory';
import { showUndoToast } from '../utils/undoToast';

export function useDocuments() {
  const qc = useQueryClient();
  const { record, undo } = useHistory();

  const { data: documents = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: api.getDocuments,
  });

  const addMutation = useMutation({
    mutationFn: api.addDocument,
    onSuccess: (created) => {
      record({
        entityType: 'document',
        entityId: created.id,
        entityName: created.displayName || created.name,
        action: 'create',
        before: null,
        after: created as unknown as Record<string, unknown>,
      });
      qc.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<DocumentMeta, 'displayName'>> }) =>
      api.updateDocument(id, updates),
    onMutate: ({ id }) => {
      const docs = qc.getQueryData<DocumentMeta[]>(queryKeys.documents) ?? [];
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
      qc.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const removeMutation = useMutation({
    mutationFn: api.removeDocument,
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
      qc.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });

  const seedMutation = useMutation({
    mutationFn: api.seedDocuments,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documents }),
  });

  return {
    documents,
    isLoading,
    isError,
    error,
    refetch,
    addDocument: (doc: DocumentMeta) => addMutation.mutateAsync(doc),
    updateDocument: (id: string, updates: Partial<Pick<DocumentMeta, 'displayName'>>) =>
      updateMutation.mutateAsync({ id, updates }),
    removeDocument: (id: string) => removeMutation.mutateAsync(id),
    loadSeedData: (data: DocumentMeta[]) => seedMutation.mutateAsync(data),
  };
}
