import type { AppNotification } from '../../types/obligation';
import { apiFetch } from './client';

export function getNotifications(): Promise<AppNotification[]> {
  return apiFetch('/api/notifications');
}

export function addNotifications(
  _items: AppNotification[],
): Promise<AppNotification[]> {
  // Server generates notifications — no-op in HTTP mode
  return getNotifications();
}

export function markAllRead(): Promise<void> {
  return apiFetch('/api/notifications/mark-all-read', { method: 'POST' });
}

export function clearAll(): Promise<void> {
  return apiFetch('/api/notifications/clear', { method: 'POST' });
}
