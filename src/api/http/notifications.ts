import type { AppNotification } from '../../types/obligation';
import { apiFetch } from './client';

export function getNotifications(orgId: string): Promise<AppNotification[]> {
  return apiFetch(`/api/orgs/${orgId}/notifications`);
}

export function addNotifications(
  orgId: string,
  _items: AppNotification[],
): Promise<AppNotification[]> {
  // Server generates notifications — no-op in HTTP mode
  return getNotifications(orgId);
}

export function markAllRead(orgId: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/notifications/mark-all-read`, { method: 'POST' });
}

export function clearAll(orgId: string): Promise<void> {
  return apiFetch(`/api/orgs/${orgId}/notifications/clear`, { method: 'POST' });
}
