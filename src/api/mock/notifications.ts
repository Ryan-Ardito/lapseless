import type { AppNotification } from '../../types/obligation';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'practiceatlas-notifications';

export function getNotifications(): Promise<AppNotification[]> {
  return simulateAsync(() => getItem<AppNotification[]>(KEY, []));
}

export function addNotifications(
  items: AppNotification[],
): Promise<AppNotification[]> {
  return simulateAsync(() => {
    const existing = getItem<AppNotification[]>(KEY, []);
    const updated = [...items, ...existing];
    setItem(KEY, updated);
    return updated;
  });
}

export function markAllRead(): Promise<void> {
  return simulateAsync(() => {
    const notifications = getItem<AppNotification[]>(KEY, []);
    setItem(KEY, notifications.map((n) => ({ ...n, read: true })));
  });
}

export function clearAll(): Promise<void> {
  return simulateAsync(() => {
    setItem(KEY, []);
  });
}
