/**
 * Auth store (Zustand, in-memory only).
 *
 * - accessToken is NEVER persisted to disk (15-min lifetime, kept in RAM).
 * - refreshToken lives in expo-secure-store (Keychain/Keystore).
 * - user profile is kept in-memory alongside the access token.
 *
 * Note: apiClient is imported here directly. The client uses a registration
 * pattern (registerAuthStore) to avoid the circular dependency at module init.
 */

import { create } from 'zustand';

import {
  deleteRefreshToken,
  getRefreshToken,
  saveRefreshToken,
} from '../lib/secure-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setAccessToken: (token: string, user: AuthUser) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

// ─── API response shapes ──────────────────────────────────────────────────────

interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface RefreshResponseData {
  accessToken: string;
  refreshToken: string;
}

// ─── Initial state ───────────────────────────────────────────────────────────

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  setAccessToken: (token, user) =>
    set({ accessToken: token, user, isAuthenticated: true, error: null }),

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Import apiClient here (not at top level) to allow registerAuthStore
      // to be called before the first request.
      const { apiClient } = await import('../api/client');
      const response = await apiClient.post<LoginResponseData>('/auth/login', {
        email,
        password,
      });
      const { accessToken, refreshToken, user } = response.data;

      await saveRefreshToken(refreshToken);
      set({
        accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      const { apiClient } = await import('../api/client');
      const response = await apiClient.post<LoginResponseData>('/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });
      const { accessToken, refreshToken, user } = response.data;

      await saveRefreshToken(refreshToken);
      set({
        accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al crear la cuenta';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await deleteRefreshToken();
    } finally {
      set({ ...initialState, isLoading: false });
    }
  },

  refreshToken: async () => {
    const storedRefreshToken = await getRefreshToken();
    if (!storedRefreshToken) return false;

    try {
      const { apiClient } = await import('../api/client');
      const response = await apiClient.post<RefreshResponseData>(
        '/auth/refresh',
        { refreshToken: storedRefreshToken },
      );
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      await saveRefreshToken(newRefreshToken);

      const currentUser = get().user;
      if (currentUser) {
        set({ accessToken, isAuthenticated: true, error: null });
      }
      return true;
    } catch {
      await deleteRefreshToken();
      set({ ...initialState });
      return false;
    }
  },
}));
