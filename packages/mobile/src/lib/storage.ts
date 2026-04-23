import { MMKV } from 'react-native-mmkv';

/**
 * Encrypted MMKV storage instance.
 * Used as the persistence layer for Zustand stores and app config.
 */
export const storage = new MMKV({
  id: 'finanzas-storage',
  // encryptionKey is injected via build-time config in Fase 1
});

/**
 * Type-safe MMKV helpers that conform to Zustand's StateStorage interface.
 */
export const mmkvStorage = {
  getItem: (name: string): string | null => {
    return storage.getString(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.delete(name);
  },
} as const;
