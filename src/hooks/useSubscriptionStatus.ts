import { useQuery } from '@tanstack/react-query';
import { getSubscriptionStatus } from '../api/http/stripe';
import { queryKeys } from './queryKeys';

export function useSubscriptionStatus(orgId: string) {
  const { data: status, isLoading } = useQuery({
    queryKey: queryKeys.subscriptionStatus(orgId),
    queryFn: () => getSubscriptionStatus(orgId),
    enabled: !!orgId && orgId !== 'demo',
  });

  return { status: status ?? null, isLoading };
}
