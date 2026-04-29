import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Persister,
  PersistedClient,
  PersistQueryClientOptions,
} from '@tanstack/react-query-persist-client';

const QUERY_CACHE_KEY = 'finanzas_query_cache';

export const createAsyncStoragePersister = (): Persister => {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const data = JSON.stringify(client);
        await AsyncStorage.setItem(QUERY_CACHE_KEY, data);
      } catch (error) {
        console.error('Failed to persist query cache:', error);
      }
    },
    restoreClient: async () => {
      try {
        const data = await AsyncStorage.getItem(QUERY_CACHE_KEY);
        if (data) {
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('Failed to restore query cache:', error);
      }
      return undefined;
    },
    removeClient: async () => {
      try {
        await AsyncStorage.removeItem(QUERY_CACHE_KEY);
      } catch (error) {
        console.error('Failed to remove query cache:', error);
      }
    },
  };
};
