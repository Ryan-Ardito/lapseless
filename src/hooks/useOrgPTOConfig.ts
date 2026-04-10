import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/pto';
import { queryKeys } from './queryKeys';

export function useOrgPTOConfig(orgId: string) {
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.orgPtoConfig(orgId),
    queryFn: () => api.getOrgPTOConfig(orgId),
    enabled: !!orgId,
  });

  const mutation = useMutation({
    mutationFn: (defaultYearlyAllowance: number) =>
      api.updateOrgPTOConfig(orgId, defaultYearlyAllowance),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.orgPtoConfig(orgId), updated);
      // Members without an explicit override read the org default — invalidate
      // any cached per-user pto config so they pick up the new fallback.
      qc.invalidateQueries({ queryKey: ['org', orgId, 'pto', 'config'] });
    },
  });

  return {
    defaultYearlyAllowance: data?.defaultYearlyAllowance ?? 160,
    isLoading,
    isError,
    error,
    refetch,
    updateDefault: (value: number) => mutation.mutateAsync(value),
    isUpdating: mutation.isPending,
  };
}
