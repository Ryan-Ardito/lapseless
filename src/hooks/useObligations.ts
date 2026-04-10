import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '../utils/notify';
import type { Obligation } from '../types/obligation';
import * as api from '../api/obligations';
import { queryKeys } from './queryKeys';
import { useHistory } from './useHistory';
import { showUndoToast } from '../utils/undoToast';
import { useOrgContext } from '../contexts/OrgContext';
import { useViewAs } from '../contexts/ViewAsContext';

export function useObligations() {
  const qc = useQueryClient();
  const { record, undo } = useHistory();
  const { orgId } = useOrgContext();
  const { viewAsUserId, isViewingAsOther } = useViewAs();

  const { data: obligations = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.obligations(orgId, viewAsUserId),
    queryFn: () => api.getObligations(orgId, viewAsUserId),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) =>
      api.createObligation(orgId, data),
    onSuccess: (created) => {
      record({
        entityType: 'obligation',
        entityId: created.id,
        entityName: created.name,
        action: 'create',
        before: null,
        after: created as unknown as Record<string, unknown>,
      });
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Obligation, 'id' | 'createdAt'>> }) =>
      api.updateObligation(orgId, id, updates),
    onMutate: ({ id }) => {
      const obligations = qc.getQueryData<Obligation[]>(queryKeys.obligations(orgId, viewAsUserId)) ?? [];
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
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteObligation(orgId, id),
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
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleObligationComplete(orgId, id),
    onMutate: (id) => {
      const obligations = qc.getQueryData<Obligation[]>(queryKeys.obligations(orgId, viewAsUserId)) ?? [];
      return { before: obligations.find((o) => o.id === id) };
    },
    onSuccess: ({ updated, renewed }, _id, context) => {
      if (renewed) {
        notify.success(`Next occurrence created (due ${renewed.dueDate})`);
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
      qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) });
    },
  });

  const seedMutation = useMutation({
    mutationFn: (data: Obligation[]) => api.seedObligations(orgId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.obligations(orgId, viewAsUserId) }),
  });

  return {
    obligations,
    isLoading,
    isError,
    error,
    refetch,
    addObligation: (data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return addMutation.mutateAsync(data);
    },
    updateObligation: (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return updateMutation.mutateAsync({ id, updates });
    },
    deleteObligation: (id: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return deleteMutation.mutateAsync(id);
    },
    toggleComplete: (id: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return toggleMutation.mutateAsync(id);
    },
    loadSeedData: (data: Obligation[]) => seedMutation.mutateAsync(data),
  };
}
