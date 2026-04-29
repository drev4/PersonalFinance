import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

interface ConfigState {
  apiUrl: string;
  isDark: boolean;
  setApiUrl: (url: string) => Promise<void>;
  setIsDark: (value: boolean) => Promise<void>;
  loadConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  isDark: false,

  setApiUrl: async (url: string) => {
    set({ apiUrl: url });
    try {
      await AsyncStorage.setItem('apiUrl', url);
    } catch (err) {
      console.error('Failed to save API URL:', err);
    }
  },

  setIsDark: async (value: boolean) => {
    set({ isDark: value });
    try {
      await AsyncStorage.setItem('isDark', value ? '1' : '0');
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  },

  loadConfig: async () => {
    try {
      const [savedUrl, savedDark] = await Promise.all([
        AsyncStorage.getItem('apiUrl'),
        AsyncStorage.getItem('isDark'),
      ]);
      const updates: Partial<Pick<ConfigState, 'apiUrl' | 'isDark'>> = {};
      if (savedUrl) updates.apiUrl = savedUrl;
      if (savedDark !== null) updates.isDark = savedDark === '1';
      if (Object.keys(updates).length > 0) set(updates);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  },
}));

export function useLoadConfig() {
  useEffect(() => {
    useConfigStore.getState().loadConfig();
  }, []);
}
