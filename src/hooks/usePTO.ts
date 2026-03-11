import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PTOEntry, PTOConfig, PTOType } from '../types/pto';
import * as api from '../api/pto';
import { queryKeys } from './queryKeys';

export function usePTO() {
  const qc = useQueryClient();

  const { data: allEntries = [], isLoading: entriesLoading, isError: entriesError, error: entriesErr, refetch: refetchEntries } = useQuery({
    queryKey: queryKeys.ptoEntries,
    queryFn: api.getPTOEntries,
  });

  const { data: config = { yearlyAllowance: 160, year: new Date().getFullYear() }, isLoading: configLoading, isError: configError, error: configErr, refetch: refetchConfig } = useQuery({
    queryKey: queryKeys.ptoConfig,
    queryFn: api.getPTOConfig,
  });

  const isLoading = entriesLoading || configLoading;
  const isError = entriesError || configError;
  const error = entriesErr ?? configErr ?? null;
  const refetch = () => { refetchEntries(); refetchConfig(); };

  const yearEntries = useMemo(
    () => allEntries.filter((e) => new Date(e.date).getFullYear() === config.year),
    [allEntries, config.year],
  );

  const totalUsed = useMemo(
    () => yearEntries.reduce((sum, e) => sum + e.hours, 0),
    [yearEntries],
  );

  const remaining = config.yearlyAllowance - totalUsed;

  const usedByType = useMemo(() => {
    const map: Record<PTOType, number> = { vacation: 0, sick: 0, personal: 0, holiday: 0, other: 0 };
    for (const e of yearEntries) {
      map[e.type] += e.hours;
    }
    return map;
  }, [yearEntries]);

  const usedByMonth = useMemo(() => {
    const map: Record<number, number> = {};
    for (const e of yearEntries) {
      const month = new Date(e.date).getMonth();
      map[month] = (map[month] ?? 0) + e.hours;
    }
    return map;
  }, [yearEntries]);

  const addMutation = useMutation({
    mutationFn: (data: Omit<PTOEntry, 'id' | 'createdAt'>) => api.createPTOEntry(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ptoEntries }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>> }) =>
      api.updatePTOEntry(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ptoEntries }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePTOEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ptoEntries }),
  });

  const configMutation = useMutation({
    mutationFn: (updates: Partial<PTOConfig>) => api.updatePTOConfig(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ptoConfig }),
  });

  const seedMutation = useMutation({
    mutationFn: api.seedPTOEntries,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ptoEntries }),
  });

  return {
    entries: yearEntries,
    allEntries,
    config,
    totalUsed,
    remaining,
    usedByType,
    usedByMonth,
    isLoading,
    isError,
    error,
    refetch,
    addEntry: (data: Omit<PTOEntry, 'id' | 'createdAt'>) => addMutation.mutateAsync(data),
    updateEntry: (id: string, updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
    updateConfig: (updates: Partial<PTOConfig>) => configMutation.mutateAsync(updates),
    loadSeedData: (data: PTOEntry[]) => seedMutation.mutateAsync(data),
  };
}
