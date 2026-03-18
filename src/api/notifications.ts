import * as mock from './mock/notifications';
import * as http from './http/notifications';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const getNotifications: typeof mock.getNotifications = (...args) => getImpl().getNotifications(...args);
export const addNotifications: typeof mock.addNotifications = (...args) => getImpl().addNotifications(...args);
export const markAllRead: typeof mock.markAllRead = (...args) => getImpl().markAllRead(...args);
export const clearAll: typeof mock.clearAll = (...args) => getImpl().clearAll(...args);
