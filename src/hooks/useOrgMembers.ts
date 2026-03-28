import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/http/orgs';
import { queryKeys } from './queryKeys';

export function useOrgMembers(orgId: string) {
  const qc = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: queryKeys.orgMembers(orgId),
    queryFn: () => api.getOrgMembers(orgId),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.updateMemberRole(orgId, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgMembers(orgId) });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(orgId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgMembers(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.orgInvites(orgId) });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (userId: string) => api.transferOwnership(orgId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgMembers(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });

  return {
    members,
    isLoading,
    updateRole: (memberId: string, role: string) =>
      updateRoleMutation.mutateAsync({ memberId, role }),
    removeMember: (memberId: string) => removeMemberMutation.mutateAsync(memberId),
    transferOwnership: (userId: string) => transferMutation.mutateAsync(userId),
    isUpdatingRole: updateRoleMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
    isTransferring: transferMutation.isPending,
  };
}
