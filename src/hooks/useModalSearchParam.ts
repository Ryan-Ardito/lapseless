import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useCallback } from 'react';

export function useModalSearchParam(paramName: string) {
  const search = useRouterState({ select: (s) => s.location.search });
  const navigate = useNavigate();

  const value = (search as Record<string, unknown>)[paramName] as string | undefined;

  const open = useCallback(
    (id: string) => {
      navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, [paramName]: id }) } as any);
    },
    [navigate, paramName],
  );

  const close = useCallback(() => {
    navigate({
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev };
        delete next[paramName];
        return next;
      },
      replace: true,
    } as any);
  }, [navigate, paramName]);

  return { value: value ?? null, open, close } as const;
}
