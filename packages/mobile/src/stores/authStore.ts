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

  setUser: (user) => set({ user }),

  setTokens: async (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    try {
      // Ensure refreshToken is a string
      const tokenString = typeof refreshToken === 'string' ? refreshToken : JSON.stringify(refreshToken);
      await SecureStore.setItemAsync('refreshToken', tokenString);
    } catch (err) {
      console.error('Failed to save refresh token:', err);
    }
  },

  clearAuth: async () => {
    set({ user: null, accessToken: null, refreshToken: null });
    try {
      await SecureStore.deleteItemAsync('refreshToken');
    } catch (err) {
      console.error('Failed to clear refresh token:', err);
    }
  },

  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  restoreTokens: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        // Handle both string tokens and JSON-encoded tokens
        const token = refreshToken.startsWith('{') ? JSON.parse(refreshToken) : refreshToken;
        set({ refreshToken: typeof token === 'string' ? token : token.refreshToken || '' });
      }
    } catch (err) {
      console.error('Failed to restore tokens:', err);
    }
  },
}));
