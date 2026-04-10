import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserPendingInvites, acceptInviteById, declineInviteById } from '../api/http/orgs';
import { queryKeys } from './queryKeys';

export function useUserInvites() {
  const qc = useQueryClient();

  const { data: invites = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.userPendingInvites,
    queryFn: getUserPendingInvites,
  });

  const acceptMutation = useMutation({
    mutationFn: (inviteId: string) => acceptInviteById(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userPendingInvites });
      qc.invalidateQueries({ queryKey: queryKeys.userOrgs });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (inviteId: string) => declineInviteById(inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userPendingInvites });
      qc.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });

  return {
    invites,
    isLoading,
    refetch,
    acceptInvite: (inviteId: string) => acceptMutation.mutateAsync(inviteId),
    acceptingId: acceptMutation.isPending ? acceptMutation.variables ?? null : null,
    declineInvite: (inviteId: string) => declineMutation.mutateAsync(inviteId),
    decliningId: declineMutation.isPending ? declineMutation.variables ?? null : null,
  };
}
