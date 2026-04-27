import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

interface ConfigState {
  apiUrl: string;
  setApiUrl: (url: string) => Promise<void>;
  loadApiUrl: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',

  setApiUrl: async (url: string) => {
    set({ apiUrl: url });
    try {
      await AsyncStorage.setItem('apiUrl', url);
    } catch (err) {
      console.error('Failed to save API URL:', err);
    }
  },

  loadApiUrl: async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('apiUrl');
      if (savedUrl) {
        set({ apiUrl: savedUrl });
      }
    } catch (err) {
      console.error('Failed to load API URL:', err);
    }
  },
}));

export function useLoadConfig() {
  useEffect(() => {
    useConfigStore.getState().loadApiUrl();
  }, []);
}
