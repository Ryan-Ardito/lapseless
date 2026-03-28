import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/http/auth';
import { queryKeys } from './queryKeys';

export function useAuthUser() {
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.authUser,
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user,
    isLoading,
    pendingInviteCount: user?.pendingInviteCount ?? 0,
  };
}
