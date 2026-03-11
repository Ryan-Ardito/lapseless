import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Obligation } from '../types/obligation';
import * as api from '../api/obligations';
import { queryKeys } from './queryKeys';

export function useObligations() {
  const qc = useQueryClient();

  const { data: obligations = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.obligations,
    queryFn: api.getObligations,
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) =>
      api.createObligation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.obligations }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Obligation, 'id' | 'createdAt'>> }) =>
      api.updateObligation(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.obligations }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteObligation,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.obligations }),
  });

  const toggleMutation = useMutation({
    mutationFn: api.toggleObligationComplete,
    onSuccess: ({ renewed }) => {
      if (renewed) {
        toast.success(`Next occurrence created (due ${renewed.dueDate})`);
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
