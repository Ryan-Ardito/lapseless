import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/http/orgs';
import { queryKeys } from './queryKeys';

export function useOrgs() {
  const qc = useQueryClient();

  const { data: orgs = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.userOrgs,
    queryFn: api.getUserOrgs,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createOrg(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.userOrgs }),
  });

  const ownedOrgs = orgs.filter((o) => o.role === 'owner');
  const memberOrgs = orgs.filter((o) => o.role !== 'owner');

  return {
    orgs,
    ownedOrgs,
    memberOrgs,
    isLoading,
    refetch,
    createOrg: (name: string) => createMutation.mutateAsync(name),
  };
}
