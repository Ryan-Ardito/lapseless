// Re-export mock client for backward compatibility.
// In HTTP mode, the http/client.ts module is used directly.
export { getItem, setItem, simulateAsync } from './mock/client';
