import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  restoreTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  setUser: (user) => {
    set({ user });
    if (user) {
      try {
        SecureStore.setItemAsync('user', JSON.stringify(user)).catch((err) =>
          console.error('Failed to save user:', err),
        );
      } catch (err) {
        console.error('Failed to save user:', err);
      }
    }
  },

  setTokens: async (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    try {
      await SecureStore.setItemAsync('accessToken', String(accessToken));
      await SecureStore.setItemAsync('refreshToken', String(refreshToken));
    } catch (err) {
      console.error('Failed to save tokens:', err);
    }
  },

  clearAuth: async () => {
    set({ user: null, accessToken: null, refreshToken: null });
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
    } catch (err) {
      console.error('Failed to clear auth:', err);
    }
  },

  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  restoreTokens: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const userJson = await SecureStore.getItemAsync('user');
      const user = userJson ? JSON.parse(userJson) : null;

      set({
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        user: user || null,
      });
    } catch (err) {
      console.error('Failed to restore auth:', err);
    }
  },
}));
