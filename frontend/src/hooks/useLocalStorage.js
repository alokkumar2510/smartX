/**
 * ─── useLocalStorage.js ────────────────────────────────
 * Hook for reading/writing values to localStorage with
 * JSON serialization and SSR safety.
 */
import { useState, useEffect } from 'react';

const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[useLocalStorage] Failed to write key "${key}"`);
    }
  }, [key, value]);

  return [value, setValue];
};

export default useLocalStorage;
