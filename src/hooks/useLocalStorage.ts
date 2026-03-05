import { useState, useCallback } from 'react';
import { getItem, setItem } from '../utils/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => getItem(key, initialValue));

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
        setItem(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set] as const;
}
