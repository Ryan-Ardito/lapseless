import type { Obligation } from '../../types/obligation';
import { getNextDueDate } from '../../utils/recurrence';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'lapseless-obligations';

export function getObligations(): Promise<Obligation[]> {
  return simulateAsync(() => getItem<Obligation[]>(KEY, []).filter((o) => !o.deletedAt));
}

export function createObligation(
  data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>,
): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(KEY, []);
    const newObligation: Obligation = {
      ...data,
      id: crypto.randomUUID(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setItem(KEY, [...obligations, newObligation]);
    return newObligation;
  });
}

export function updateObligation(
  id: string,
  updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>,
): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(KEY, []);
    const updated = obligations.map((o) => (o.id === id ? { ...o, ...updates } : o));
    setItem(KEY, updated);
    return updated.find((o) => o.id === id)!;
  });
}

export function deleteObligation(id: string): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(KEY, []);
    const target = obligations.find((o) => o.id === id);
    if (!target) throw new Error(`Obligation ${id} not found`);
    const deletedAt = new Date().toISOString();
    setItem(KEY, obligations.map((o) => (o.id === id ? { ...o, deletedAt } : o)));
    return { ...target, deletedAt };
  });
}

export function restoreObligation(id: string): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(KEY, []);
    const updated = obligations.map((o) =>
      o.id === id ? { ...o, deletedAt: undefined } : o,
    );
    setItem(KEY, updated);
    return updated.find((o) => o.id === id)!;
  });
}

export function toggleObligationComplete(
  id: string,
): Promise<{ updated: Obligation; renewed?: Obligation }> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(KEY, []);
    const obligation = obligations.find((o) => o.id === id);
    if (!obligation) throw new Error(`Obligation ${id} not found`);

    const nowCompleting = !obligation.completed;
    const updated = { ...obligation, completed: nowCompleting };
    let renewed: Obligation | undefined;

    if (nowCompleting && obligation.recurrence?.autoRenew) {
      const nextDueDate = getNextDueDate(obligation.dueDate, obligation.recurrence.type);
      const nextStartDate = obligation.startDate
        ? getNextDueDate(obligation.startDate, obligation.recurrence.type)
        : undefined;

      renewed = {
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
    }

    const result = obligations.map((o) => (o.id === id ? updated : o));
    if (renewed) result.push(renewed);
    setItem(KEY, result);

    return { updated, renewed };
  });
}

export function seedObligations(data: Obligation[]): Promise<Obligation[]> {
  return simulateAsync(() => {
    setItem(KEY, data);
    return data;
  });
}
