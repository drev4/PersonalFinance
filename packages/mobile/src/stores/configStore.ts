import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

interface ConfigState {
  apiUrl: string;
  isDark: boolean;
  themeFollowsSystem: boolean;
  budgetAlertsEnabled: boolean;
  biometricEnabled: boolean;
  setApiUrl: (url: string) => Promise<void>;
  setIsDark: (value: boolean) => Promise<void>;
  resetTheme: () => Promise<void>;
  setBudgetAlertsEnabled: (value: boolean) => Promise<void>;
  setBiometricEnabled: (value: boolean) => Promise<void>;
  loadConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  isDark: false,
  themeFollowsSystem: true,
  budgetAlertsEnabled: true,
  biometricEnabled: false,

  setApiUrl: async (url: string) => {
    set({ apiUrl: url });
    try {
      await SecureStore.setItemAsync('apiUrl', url);
    } catch (err) {
      console.error('Failed to save API URL:', err);
    }
  },

  setIsDark: async (value: boolean) => {
    set({ isDark: value, themeFollowsSystem: false });
    try {
      await Promise.all([
        SecureStore.setItemAsync('isDark', value ? '1' : '0'),
        SecureStore.setItemAsync('themeFollowsSystem', '0'),
      ]);
    } catch (err) {
      console.error('Failed to save theme preference:', err);
    }
  },

  resetTheme: async () => {
    set({ themeFollowsSystem: true });
    try {
      await SecureStore.deleteItemAsync('isDark');
      await SecureStore.deleteItemAsync('themeFollowsSystem');
    } catch (err) {
      console.error('Failed to reset theme:', err);
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

  setBiometricEnabled: async (value: boolean) => {
    set({ biometricEnabled: value });
    try {
      await SecureStore.setItemAsync('biometricEnabled', value ? '1' : '0');
    } catch (err) {
      console.error('Failed to save biometric preference:', err);
    }
  },

  loadConfig: async () => {
    try {
      const [savedUrl, savedDark, savedFollowsSystem, savedAlerts, savedBiometric] =
        await Promise.all([
          SecureStore.getItemAsync('apiUrl'),
          SecureStore.getItemAsync('isDark'),
          SecureStore.getItemAsync('themeFollowsSystem'),
          SecureStore.getItemAsync('budgetAlertsEnabled'),
          SecureStore.getItemAsync('biometricEnabled'),
        ]);
      const updates: Partial<
        Pick<
          ConfigState,
          'apiUrl' | 'isDark' | 'themeFollowsSystem' | 'budgetAlertsEnabled' | 'biometricEnabled'
        >
      > = {};
      if (savedUrl) updates.apiUrl = savedUrl;
      // themeFollowsSystem: default true (follow system), false only if explicitly overridden
      updates.themeFollowsSystem = savedFollowsSystem !== '0';
      if (savedDark !== null) updates.isDark = savedDark === '1';
      if (savedAlerts !== null) updates.budgetAlertsEnabled = savedAlerts !== '0';
      if (savedBiometric !== null) updates.biometricEnabled = savedBiometric === '1';
      set(updates);
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
