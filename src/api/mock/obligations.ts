import type { Obligation } from '../../types/obligation';
import { getNextDueDate } from '../../utils/recurrence';
import { getItem, setItem, simulateAsync } from './client';

const key = (orgId: string) => `practiceatlas-${orgId}-obligations`;

export function getObligations(orgId: string, _userId?: string): Promise<Obligation[]> {
  return simulateAsync(() => getItem<Obligation[]>(key(orgId), []).filter((o) => !o.deletedAt));
}

export function createObligation(
  orgId: string,
  data: Omit<Obligation, 'id' | 'completed' | 'createdAt'>,
  _targetUserId?: string,
): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(key(orgId), []);
    const newObligation: Obligation = {
      ...data,
      id: crypto.randomUUID(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setItem(key(orgId), [...obligations, newObligation]);
    return newObligation;
  });
}

export function updateObligation(
  orgId: string,
  id: string,
  updates: Partial<Omit<Obligation, 'id' | 'createdAt'>>,
): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(key(orgId), []);
    const updated = obligations.map((o) => (o.id === id ? { ...o, ...updates } : o));
    setItem(key(orgId), updated);
    return updated.find((o) => o.id === id)!;
  });
}

export function deleteObligation(orgId: string, id: string): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(key(orgId), []);
    const target = obligations.find((o) => o.id === id);
    if (!target) throw new Error(`Obligation ${id} not found`);
    const deletedAt = new Date().toISOString();
    setItem(key(orgId), obligations.map((o) => (o.id === id ? { ...o, deletedAt } : o)));
    return { ...target, deletedAt };
  });
}

export function restoreObligation(orgId: string, id: string): Promise<Obligation> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(key(orgId), []);
    const updated = obligations.map((o) =>
      o.id === id ? { ...o, deletedAt: undefined } : o,
    );
    setItem(key(orgId), updated);
    return updated.find((o) => o.id === id)!;
  });
}

export function toggleObligationComplete(
  orgId: string,
  id: string,
): Promise<{ updated: Obligation; renewed?: Obligation }> {
  return simulateAsync(() => {
    const obligations = getItem<Obligation[]>(key(orgId), []);
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
    setItem(key(orgId), result);

    return { updated, renewed };
  });
}

export function seedObligations(orgId: string, data: Obligation[]): Promise<Obligation[]> {
  return simulateAsync(() => {
    setItem(key(orgId), data);
    return data;
  });
}
