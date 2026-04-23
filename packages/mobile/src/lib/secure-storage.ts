/**
 * Secure storage wrapper.
 *
 * Sensitive data (tokens) → expo-secure-store (Keychain on iOS, Keystore on Android).
 * Non-sensitive preferences → react-native-mmkv via the existing mmkvStorage helper.
 */

import * as SecureStore from 'expo-secure-store';

import { storage } from './storage';

// ─── Keys ───────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_KEY = 'finanzas.refreshToken';

// ─── SecureStore helpers (refresh token) ────────────────────────────────────

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ─── MMKV helpers (non-sensitive preferences) ────────────────────────────────

export function getPreference<T>(key: string): T | undefined {
  const raw = storage.getString(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function setPreference<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function deletePreference(key: string): void {
  storage.delete(key);
}

// ─── Specific preference helpers ─────────────────────────────────────────────

const BIOMETRIC_ENABLED_KEY = 'finanzas.biometricEnabled';

export function getBiometricEnabled(): boolean {
  return getPreference<boolean>(BIOMETRIC_ENABLED_KEY) ?? false;
}

export function setBiometricEnabled(enabled: boolean): void {
  setPreference(BIOMETRIC_ENABLED_KEY, enabled);
}

const LAST_ACTIVE_KEY = 'finanzas.lastActiveAt';

export function getLastActiveAt(): number | undefined {
  return getPreference<number>(LAST_ACTIVE_KEY);
}

export function setLastActiveAt(timestamp: number): void {
  setPreference(LAST_ACTIVE_KEY, timestamp);
}
