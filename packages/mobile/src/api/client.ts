/**
 * Type-safe HTTP client for @finanzas/mobile.
 *
 * - Reads accessToken from Zustand store (in-memory, no stale closures).
 * - Adds "Authorization: Bearer <token>", "X-Client-Type: mobile", "X-App-Version".
 * - On 401: attempts a single token refresh via POST /auth/refresh.
 *   - On success: retries the original request with the new token.
 *   - On failure: clears SecureStore and logs out.
 * - Offline: fetch errors pass through (Fase 7 will add queue layer).
 *
 * Architecture note: the store registers itself via `registerAuthStore()` at
 * app startup. This avoids circular imports while keeping synchronous token reads.
 */

// eslint-disable-next-line import/no-named-as-default
import Constants from 'expo-constants';

import { deleteRefreshToken, getRefreshToken, saveRefreshToken } from '../lib/secure-storage';

declare const process: { env: Record<string, string | undefined> };

const BASE_URL: string =
  process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const APP_VERSION: string = Constants.expoConfig?.version ?? '1.0.0';

// ─── Types ───────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Internal flag: prevents infinite refresh loop */
  _isRetry?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Store registration (avoids circular imports) ─────────────────────────────

interface AuthStoreRef {
  getAccessToken: () => string | null;
  getUser: () => { id: string; email: string; firstName: string; lastName: string } | null;
  setAccessToken: (
    token: string,
    user: { id: string; email: string; firstName: string; lastName: string },
  ) => void;
  logout: () => Promise<void>;
}

let _authStore: AuthStoreRef | null = null;

/**
 * Called once from the root layout after the Zustand store is initialised.
 * Wires up the auth store so the client can read tokens synchronously.
 */
export function registerAuthStore(store: AuthStoreRef): void {
  _authStore = store;
}

function getAuthStore(): AuthStoreRef {
  if (_authStore === null) {
    // Fallback: no token available (cold start before registration)
    return {
      getAccessToken: () => null,
      getUser: () => null,
      setAccessToken: () => { /* no-op until registered */ },
      logout: async () => { /* no-op until registered */ },
    };
  }
  return _authStore;
}

// ─── Refresh helper ──────────────────────────────────────────────────────────

async function attemptRefresh(): Promise<boolean> {
  const storedRefreshToken = await getRefreshToken();
  if (!storedRefreshToken) return false;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Client-Type': 'mobile',
        'X-App-Version': APP_VERSION,
      },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!response.ok) return false;

    const json = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      user?: { id: string; email: string; firstName: string; lastName: string };
    };

    await saveRefreshToken(json.refreshToken);

    const store = getAuthStore();
    const user = json.user ?? store.getUser();
    if (user) {
      store.setAccessToken(json.accessToken, user);
    }

    return true;
  } catch {
    return false;
  }
}

// ─── Core request ────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, _isRetry = false } = options;

  const token = getAuthStore().getAccessToken();

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Type': 'mobile',
    'X-App-Version': APP_VERSION,
    ...headers,
  };

  if (token) {
    fetchHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Network errors bubble up as-is; Fase 7 will add offline queue interception
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: fetchHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // ── 401 handling: single refresh attempt ──────────────────────────────────
  if (response.status === 401 && !_isRetry) {
    const refreshed = await attemptRefresh();

    if (refreshed) {
      return request<T>(path, { ...options, _isRetry: true });
    }

    // Refresh failed — clear all auth state
    await deleteRefreshToken();
    await getAuthStore().logout();

    throw new ApiError(401, 'Sesión expirada. Por favor, inicia sesión de nuevo.');
  }

  if (!response.ok) {
    let errorMessage = `Error ${response.status}`;
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) errorMessage = errorBody.message;
    } catch {
      errorMessage = await response.text().catch(() => errorMessage);
    }
    throw new ApiError(response.status, errorMessage);
  }

  const data = (await response.json()) as T;
  return { data, status: response.status };
}

// ─── Public client ────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'GET', headers }),

  post: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),

  put: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body, headers }),

  patch: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PATCH', body, headers }),

  delete: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', headers }),
} as const;
