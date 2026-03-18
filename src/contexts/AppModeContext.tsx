import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type AppMode = 'demo' | 'production';

let currentAppMode: AppMode = 'production';

const AppModeContext = createContext<AppMode>('production');

export function AppModeProvider({ mode, children }: { mode: AppMode; children: ReactNode }) {
  const queryClient = useQueryClient();

  currentAppMode = mode;

  useEffect(() => {
    return () => { queryClient.clear(); };
  }, [mode, queryClient]);

  return (
    <AppModeContext.Provider value={mode}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppMode {
  return useContext(AppModeContext);
}

export function getAppMode(): AppMode {
  return currentAppMode;
}
