import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Profile } from '../types/profile';
import * as api from '../api/profile';
import { queryKeys } from './queryKeys';

export function useProfile() {
  const qc = useQueryClient();

  const { data: profile = { name: '', email: '', phone: '', jobTitle: '', timezone: '' }, isLoading } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: api.getProfile,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Profile>) => api.updateProfile(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
  });

  const clearMutation = useMutation({
    mutationFn: api.clearProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
  });

  const initials = useMemo(() => {
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === '') return '';
    return parts
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }, [profile.name]);

  const hasProfile = profile.name.trim().length > 0;

  return {
    profile,
    isLoading,
    updateProfile: (updates: Partial<Profile>) => updateMutation.mutateAsync(updates),
    clearProfile: () => clearMutation.mutateAsync(),
    initials,
    hasProfile,
  };
}
