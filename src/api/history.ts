import * as mock from './mock/history';
import * as http from './http/history';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const getHistory: typeof mock.getHistory = (...args) => getImpl().getHistory(...args);
export const addHistoryEntry: typeof mock.addHistoryEntry = (...args) => getImpl().addHistoryEntry(...args);
export const updateHistoryEntry: typeof mock.updateHistoryEntry = (...args) => getImpl().updateHistoryEntry(...args);
export const clearHistory: typeof mock.clearHistory = (...args) => getImpl().clearHistory(...args);
