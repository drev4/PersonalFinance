import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Simple in-memory storage for now, will use MMKV in persistence later
const storage: Record<string, string> = {};

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => {
      const value = storage[key];
      return value ?? null;
    },
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
  },
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      networkMode: 'offlineFirst',
      retry: 2,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
});
