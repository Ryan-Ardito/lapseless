import { useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Obligation } from '../types/obligation';
import { useLocalStorage } from './useLocalStorage';
import { getNextDueDate } from '../utils/recurrence';

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
      setObligations((prev) => {
        const obligation = prev.find((o) => o.id === id);
        if (!obligation) return prev;

        const nowCompleting = !obligation.completed;
        const updated = prev.map((o) => (o.id === id ? { ...o, completed: nowCompleting } : o));

        // Auto-renewal: create next occurrence when completing a recurring obligation
        if (nowCompleting && obligation.recurrence?.autoRenew) {
          const nextDueDate = getNextDueDate(obligation.dueDate, obligation.recurrence.type);
          const nextStartDate = obligation.startDate
            ? getNextDueDate(obligation.startDate, obligation.recurrence.type)
            : undefined;

          const renewed: Obligation = {
            ...obligation,
            id: crypto.randomUUID(),
            dueDate: nextDueDate,
            startDate: nextStartDate,
            completed: false,
            createdAt: new Date().toISOString(),
            ceuTracking: obligation.ceuTracking
              ? { ...obligation.ceuTracking, completed: 0 }
              : undefined,
          };

          toast.success(`Next ${obligation.recurrence.type} occurrence created (due ${nextDueDate})`);
          return [...updated, renewed];
        }

        return updated;
      });
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
