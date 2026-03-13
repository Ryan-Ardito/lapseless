import * as mock from './mock/notifications';
import * as http from './http/notifications';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const getNotifications = impl.getNotifications;
export const addNotifications = impl.addNotifications;
export const markAllRead = impl.markAllRead;
export const clearAll = impl.clearAll;
