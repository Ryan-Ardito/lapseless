import { useCallback } from 'react';
import type { Obligation } from '../types/obligation';
import { useLocalStorage } from './useLocalStorage';

export function useObligations() {
  const [obligations, setObligations] = useLocalStorage<Obligation[]>('lapseless-obligations', []);

  const addObligation = useCallback(
    (obligation: Omit<Obligation, 'id' | 'completed' | 'createdAt'>) => {
      const newObligation: Obligation = {
        ...obligation,
        id: crypto.randomUUID(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setObligations((prev) => [...prev, newObligation]);
    },
    [setObligations],
  );

  const deleteObligation = useCallback(
    (id: string) => {
      setObligations((prev) => prev.filter((o) => o.id !== id));
    },
    [setObligations],
  );

  const toggleComplete = useCallback(
    (id: string) => {
      setObligations((prev) =>
        prev.map((o) => (o.id === id ? { ...o, completed: !o.completed } : o)),
      );
    },
    [setObligations],
  );

  const updateObligation = useCallback(
    (id: string, updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>) => {
      setObligations((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      );
    },
    [setObligations],
  );

  const loadSeedData = useCallback(
    (seed: Obligation[]) => {
      setObligations(seed);
    },
    [setObligations],
  );

  return { obligations, addObligation, updateObligation, deleteObligation, toggleComplete, loadSeedData };
}
