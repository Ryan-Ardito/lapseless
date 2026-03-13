// Mock API client — wraps localStorage in async to match real API signatures.
// When switching to a real backend, replace this with fetch/axios config.

export { getItem, setItem } from '../../utils/storage';

// Optional simulated delay for testing loading states. Set to 0 for instant.
const SIMULATED_DELAY_MS = 0;

export async function simulateAsync<T>(fn: () => T): Promise<T> {
  if (SIMULATED_DELAY_MS > 0) {
    await new Promise((r) => setTimeout(r, SIMULATED_DELAY_MS));
  }
  return fn();
}
