import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PTOEntry, PTOConfig, PTOType } from '../types/pto';
import * as api from '../api/pto';
import { queryKeys } from './queryKeys';
import { useHistory } from './useHistory';
import { showUndoToast } from '../utils/undoToast';
import { notify } from '../utils/notify';
import { useOrgContext } from '../contexts/OrgContext';
import { useViewAs } from '../contexts/ViewAsContext';

export function usePTO(year: number) {
  const qc = useQueryClient();
  const { record, undo } = useHistory();
  const { orgId } = useOrgContext();
  const { viewAsUserId, isViewingAsOther } = useViewAs();

  const { data: allEntries = [], isLoading: entriesLoading, isError: entriesError, error: entriesErr, refetch: refetchEntries } = useQuery({
    queryKey: [...queryKeys.ptoEntries(orgId, viewAsUserId), year],
    queryFn: () => api.getPTOEntries(orgId, year, viewAsUserId),
  });

  const { data: config = { yearlyAllowance: 160, year }, isLoading: configLoading, isError: configError, error: configErr, refetch: refetchConfig } = useQuery({
    queryKey: [...queryKeys.ptoConfig(orgId, viewAsUserId), year],
    queryFn: () => api.getPTOConfig(orgId, year, viewAsUserId),
  });

  const isLoading = entriesLoading || configLoading;
  const isError = entriesError || configError;
  const error = entriesErr ?? configErr ?? null;
  const refetch = () => { refetchEntries(); refetchConfig(); };

  const yearEntries = useMemo(
    () => allEntries.filter((e) => {
      const startYear = parseInt(e.startDate.slice(0, 4), 10);
      const endYear = parseInt(e.endDate.slice(0, 4), 10);
      return startYear <= year && endYear >= year;
    }),
    [allEntries, year],
  );

  const totalUsed = useMemo(
    () => yearEntries.reduce((sum, e) => sum + e.hours, 0),
    [yearEntries],
  );

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const usedHours = useMemo(
    () => yearEntries.filter((e) => e.startDate <= todayStr).reduce((sum, e) => sum + e.hours, 0),
    [yearEntries, todayStr],
  );

  const upcomingHours = useMemo(
    () => yearEntries.filter((e) => e.startDate > todayStr).reduce((sum, e) => sum + e.hours, 0),
    [yearEntries, todayStr],
  );

  const remaining = config.yearlyAllowance - totalUsed;

  const usedByType = useMemo(() => {
    const map: Record<PTOType, number> = { vacation: 0, sick: 0, personal: 0, holiday: 0, other: 0 };
    for (const e of yearEntries) {
      map[e.type] += e.hours;
    }
    return map;
  }, [yearEntries]);

  const addMutation = useMutation({
    mutationFn: (data: Omit<PTOEntry, 'id' | 'createdAt'>) => api.createPTOEntry(orgId, data),
    onSuccess: (created) => {
      record({
        entityType: 'pto-entry',
        entityId: created.id,
        entityName: `${created.type} — ${created.startDate}`,
        action: 'create',
        before: null,
        after: created as unknown as Record<string, unknown>,
      });
      qc.invalidateQueries({ queryKey: queryKeys.ptoEntries(orgId, viewAsUserId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>> }) =>
      api.updatePTOEntry(orgId, id, updates),
    onMutate: ({ id }) => {
      const entries = qc.getQueryData<PTOEntry[]>([...queryKeys.ptoEntries(orgId, viewAsUserId), year]) ?? [];
      return { before: entries.find((e) => e.id === id) };
    },
    onSuccess: (updated, _vars, context) => {
      if (context?.before) {
        record({
          entityType: 'pto-entry',
          entityId: updated.id,
          entityName: `${updated.type} — ${updated.startDate}`,
          action: 'update',
          before: context.before as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.ptoEntries(orgId, viewAsUserId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePTOEntry(orgId, id),
    onSuccess: (deleted) => {
      const entry = {
        entityType: 'pto-entry' as const,
        entityId: deleted.id,
        entityName: `${deleted.type} — ${deleted.startDate}`,
        action: 'delete' as const,
        before: deleted as unknown as Record<string, unknown>,
        after: null,
      };
      record(entry).then((recorded) => {
        showUndoToast(`PTO entry deleted`, () => undo(recorded));
      });
      qc.invalidateQueries({ queryKey: queryKeys.ptoEntries(orgId, viewAsUserId) });
    },
  });

  const configMutation = useMutation({
    mutationFn: (updates: Partial<PTOConfig>) => api.updatePTOConfig(orgId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ptoConfig(orgId, viewAsUserId) }),
  });

  const seedMutation = useMutation({
    mutationFn: (data: PTOEntry[]) => api.seedPTOEntries(orgId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ptoEntries(orgId, viewAsUserId) }),
  });

  return {
    entries: yearEntries,
    allEntries,
    config,
    totalUsed,
    usedHours,
    upcomingHours,
    todayStr,
    remaining,
    usedByType,
    isLoading,
    isError,
    error,
    refetch,
    addEntry: (data: Omit<PTOEntry, 'id' | 'createdAt'>) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return addMutation.mutateAsync(data);
    },
    updateEntry: (id: string, updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return updateMutation.mutateAsync({ id, updates });
    },
    deleteEntry: (id: string) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return deleteMutation.mutateAsync(id);
    },
    updateConfig: (updates: Partial<PTOConfig>) => {
      if (isViewingAsOther) { notify.info('Switch to your own dashboard to make changes'); return; }
      return configMutation.mutateAsync(updates);
    },
    loadSeedData: (data: PTOEntry[]) => seedMutation.mutateAsync(data),
  };
}
