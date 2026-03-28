import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/http/orgs';
import { queryKeys } from './queryKeys';
import type { OrgMembership, DeletedOrg } from '../types/org';

export function useOrgs() {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.userOrgs,
    queryFn: api.getUserOrgs,
  });

  const orgs: OrgMembership[] = data?.orgs ?? [];
  const deletedOrgs: DeletedOrg[] = data?.deletedOrgs ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createOrg(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (orgId: string) => api.deleteOrg(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (orgId: string) => api.restoreOrg(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (orgId: string) => api.leaveOrg(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });

  const ownedOrgs = orgs.filter((o) => o.role === 'owner');
  const memberOrgs = orgs.filter((o) => o.role !== 'owner');

  return {
    orgs,
    deletedOrgs,
    ownedOrgs,
    memberOrgs,
    isLoading,
    refetch,
    createOrg: (name: string) => createMutation.mutateAsync(name),
    deleteOrg: (orgId: string) => deleteMutation.mutateAsync(orgId),
    restoreOrg: (orgId: string) => restoreMutation.mutateAsync(orgId),
    leaveOrg: (orgId: string) => leaveMutation.mutateAsync(orgId),
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isLeaving: leaveMutation.isPending,
  };
}
