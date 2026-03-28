import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/http/orgs';
import { queryKeys } from './queryKeys';

export function useOrgInvites(orgId: string) {
  const qc = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: queryKeys.orgInvites(orgId),
    queryFn: () => api.getOrgInvites(orgId),
  });

  const createMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      api.createInvite(orgId, email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgInvites(orgId) });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => api.revokeInvite(orgId, inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgInvites(orgId) });
    },
  });

  return {
    invites,
    isLoading,
    createInvite: (email: string, role: string) =>
      createMutation.mutateAsync({ email, role }),
    revokeInvite: (inviteId: string) => revokeMutation.mutateAsync(inviteId),
    isCreating: createMutation.isPending,
    revokingId: revokeMutation.isPending ? (revokeMutation.variables as string) ?? null : null,
  };
}
