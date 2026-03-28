import * as mock from './mock/notifications';
import * as http from './http/notifications';
import { getAppMode } from '../contexts/AppModeContext';

const isDemo = () => getAppMode() === 'demo';

export const getNotifications = (orgId: string) =>
  isDemo() ? mock.getNotifications() : http.getNotifications(orgId);
export const addNotifications = (orgId: string, items: Parameters<typeof mock.addNotifications>[0]) =>
  isDemo() ? mock.addNotifications(items) : http.addNotifications(orgId, items);
export const markAllRead = (orgId: string) =>
  isDemo() ? mock.markAllRead() : http.markAllRead(orgId);
export const clearAll = (orgId: string) =>
  isDemo() ? mock.clearAll() : http.clearAll(orgId);
