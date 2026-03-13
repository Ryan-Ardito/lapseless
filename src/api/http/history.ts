// History stays client-side (localStorage) even in HTTP mode.
// Re-export the mock implementation as-is.
export { getHistory, addHistoryEntry, updateHistoryEntry, clearHistory } from '../mock/history';
