import type { AppNotification } from '../../types/obligation';
import { getItem, setItem, simulateAsync } from './client';

const key = (orgId: string) => `practiceatlas-${orgId}-notifications`;

export function getNotifications(orgId: string): Promise<AppNotification[]> {
  return simulateAsync(() => getItem<AppNotification[]>(key(orgId), []));
}

export function addNotifications(
  orgId: string,
  items: AppNotification[],
): Promise<AppNotification[]> {
  return simulateAsync(() => {
    const existing = getItem<AppNotification[]>(key(orgId), []);
    const updated = [...items, ...existing];
    setItem(key(orgId), updated);
    return updated;
  });
}

export function markAllRead(orgId: string): Promise<void> {
  return simulateAsync(() => {
    const notifications = getItem<AppNotification[]>(key(orgId), []);
    setItem(key(orgId), notifications.map((n) => ({ ...n, read: true })));
  });
}

export function clearAll(orgId: string): Promise<void> {
  return simulateAsync(() => {
    setItem(key(orgId), []);
  });
}
