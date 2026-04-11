import { createContext, useContext, type ReactNode } from 'react';
import type * as HttpApi from '../api/http';

export type ApiBackend = typeof HttpApi;

const ApiContext = createContext<ApiBackend | null>(null);

export function ApiProvider({ backend, children }: { backend: ApiBackend; children: ReactNode }) {
  return <ApiContext.Provider value={backend}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiBackend {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used within ApiProvider');
  return api;
}
