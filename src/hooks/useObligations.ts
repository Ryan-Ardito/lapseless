import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Obligation } from '../types/obligation';
import * as api from '../api/obligations';
import { queryKeys } from './queryKeys';
import { useHistory } from './useHistory';
import { showUndoToast } from '../utils/undoToast';

export function useObligations() {
  const qc = useQueryClient();
  const { record, undo } = useHistory();

  const { data: obligations = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.obligations,
    queryFn: api.getObligations,
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) =>
      api.createObligation(data),
    onSuccess: (created) => {
      record({
        entityType: 'obligation',
        entityId: created.id,
        entityName: created.name,
        action: 'create',
        before: null,
        after: created as unknown as Record<string, unknown>,
      });
      qc.invalidateQueries({ queryKey: queryKeys.obligations });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Obligation, 'id' | 'createdAt'>> }) =>
      api.updateObligation(id, updates),
    onMutate: ({ id }) => {
      const obligations = qc.getQueryData<Obligation[]>(queryKeys.obligations) ?? [];
      return { before: obligations.find((o) => o.id === id) };
    },
    onSuccess: (updated, _vars, context) => {
      if (context?.before) {
        record({
          entityType: 'obligation',
          entityId: updated.id,
          entityName: updated.name,
          action: 'update',
          before: context.before as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.obligations });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteObligation,
    onSuccess: (deleted) => {
      const entry = {
        entityType: 'obligation' as const,
        entityId: deleted.id,
        entityName: deleted.name,
        action: 'delete' as const,
        before: deleted as unknown as Record<string, unknown>,
        after: null,
      };
      record(entry).then((recorded) => {
        showUndoToast(`"${deleted.name}" deleted`, () => undo(recorded));
      });
      qc.invalidateQueries({ queryKey: queryKeys.obligations });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: api.toggleObligationComplete,
    onMutate: (id) => {
      const obligations = qc.getQueryData<Obligation[]>(queryKeys.obligations) ?? [];
      return { before: obligations.find((o) => o.id === id) };
    },
    onSuccess: ({ updated, renewed }, _id, context) => {
      if (renewed) {
        toast.success(`Next occurrence created (due ${renewed.dueDate})`);
      }
      if (context?.before) {
        record({
          entityType: 'obligation',
          entityId: updated.id,
          entityName: updated.name,
          action: updated.completed ? 'complete' : 'uncomplete',
          before: context.before as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
          renewedId: renewed?.id,
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.obligations });
    },
  });

  const seedMutation = useMutation({
    mutationFn: api.seedObligations,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.obligations }),
  });

  return {
    obligations,
    isLoading,
    isError,
    error,
    refetch,
    addObligation: (data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) =>
      addMutation.mutateAsync(data),
    updateObligation: (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteObligation: (id: string) => deleteMutation.mutateAsync(id),
    toggleComplete: (id: string) => toggleMutation.mutateAsync(id),
    loadSeedData: (data: Obligation[]) => seedMutation.mutateAsync(data),
  };
}
