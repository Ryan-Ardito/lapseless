import { useCallback, useMemo } from 'react';
import type { PTOEntry, PTOConfig, PTOType } from '../types/pto';
import { useLocalStorage } from './useLocalStorage';

const currentYear = new Date().getFullYear();

export function usePTO() {
  const [entries, setEntries] = useLocalStorage<PTOEntry[]>('lapseless-pto', []);
  const [config, setConfig] = useLocalStorage<PTOConfig>('lapseless-pto-config', {
    yearlyAllowance: 160, // 20 days * 8 hours
    year: currentYear,
  });

  const yearEntries = useMemo(
    () => entries.filter((e) => new Date(e.date).getFullYear() === config.year),
    [entries, config.year],
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

  const addEntry = useCallback(
    (entry: Omit<PTOEntry, 'id' | 'createdAt'>) => {
      const newEntry: PTOEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setEntries((prev) => [...prev, newEntry]);
    },
    [setEntries],
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<Omit<PTOEntry, 'id' | 'createdAt'>>) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    },
    [setEntries],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [setEntries],
  );

  const updateConfig = useCallback(
    (updates: Partial<PTOConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
    },
    [setConfig],
  );

  return {
    entries: yearEntries,
    allEntries: entries,
    config,
    totalUsed,
    remaining,
    usedByType,
    usedByMonth,
    addEntry,
    updateEntry,
    deleteEntry,
    updateConfig,
  };
}
