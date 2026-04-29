import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

interface ConfigState {
  apiUrl: string;
  isDark: boolean;
  budgetAlertsEnabled: boolean;
  setApiUrl: (url: string) => Promise<void>;
  setIsDark: (value: boolean) => Promise<void>;
  setBudgetAlertsEnabled: (value: boolean) => Promise<void>;
  loadConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  isDark: false,
  budgetAlertsEnabled: true,

  setApiUrl: async (url: string) => {
    set({ apiUrl: url });
    try {
      await SecureStore.setItemAsync('apiUrl', url);
    } catch (err) {
      console.error('Failed to save API URL:', err);
    }
  },

  setIsDark: async (value: boolean) => {
    set({ isDark: value });
    try {
      await SecureStore.setItemAsync('isDark', value ? '1' : '0');
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  },

  setBudgetAlertsEnabled: async (value: boolean) => {
    set({ budgetAlertsEnabled: value });
    try {
      await SecureStore.setItemAsync('budgetAlertsEnabled', value ? '1' : '0');
    } catch (err) {
      console.error('Failed to save budget alerts preference:', err);
    }
  },

  loadConfig: async () => {
    try {
      const [savedUrl, savedDark, savedAlerts] = await Promise.all([
        SecureStore.getItemAsync('apiUrl'),
        SecureStore.getItemAsync('isDark'),
        SecureStore.getItemAsync('budgetAlertsEnabled'),
      ]);
      const updates: Partial<Pick<ConfigState, 'apiUrl' | 'isDark' | 'budgetAlertsEnabled'>> = {};
      if (savedUrl) updates.apiUrl = savedUrl;
      if (savedDark !== null) updates.isDark = savedDark === '1';
      if (savedAlerts !== null) updates.budgetAlertsEnabled = savedAlerts !== '0';
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
