import * as mock from './mock/history';
import * as http from './http/history';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const getHistory = impl.getHistory;
export const addHistoryEntry = impl.addHistoryEntry;
export const updateHistoryEntry = impl.updateHistoryEntry;
export const clearHistory = impl.clearHistory;
