import { getAppMode } from '../contexts/AppModeContext';

function resolveKey(key: string): string {
  return getAppMode() === 'demo' ? `demo:${key}` : key;
}

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(resolveKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(resolveKey(key), JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(resolveKey(key));
}
