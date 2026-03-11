import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DocumentMeta } from '../types/obligation';
import * as api from '../api/documents';
import { queryKeys } from './queryKeys';

export function useDocuments() {
  const qc = useQueryClient();

  const { data: documents = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: api.getDocuments,
  });

  const addMutation = useMutation({
    mutationFn: api.addDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documents }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<DocumentMeta, 'displayName'>> }) =>
      api.updateDocument(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documents }),
  });

  const removeMutation = useMutation({
    mutationFn: api.removeDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.documents }),
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
