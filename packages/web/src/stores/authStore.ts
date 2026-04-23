import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  baseCurrency: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: {
    locale: string;
    theme: 'light' | 'dark';
    dashboardWidgets: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface AuthStore {
  user: SafeUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: SafeUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user: SafeUser, token: string) => {
        set({ user, accessToken: token, isAuthenticated: true });
      },
      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'finanzas-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
