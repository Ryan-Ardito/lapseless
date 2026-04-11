import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../contexts/ApiContext';
import type { UserSettings } from '../api/http/settings';
import { queryKeys } from './queryKeys';

const DEFAULTS: UserSettings = {
  theme: 'system',
  defaultReminder: { channels: ['email'], daysBefore: 7, frequency: 'once', time: '09:00' },
};

export function useSettings() {
  const api = useApi();
  const qc = useQueryClient();

  const { data: settings = DEFAULTS, isLoading } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: api.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<UserSettings>) => api.updateSettings(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings }),
  });

  return {
    settings,
    isLoading,
    updateSettings: (updates: Partial<UserSettings>) => updateMutation.mutateAsync(updates),
  };
}

export type { UserSettings };
