/**
 * useBiometric — detects and invokes biometric authentication.
 *
 * - isAvailable: device supports biometrics and has enrolled credentials.
 * - biometricTypes: list of supported authenticator types.
 * - authenticate(): triggers Face ID / Touch ID; max 3 failures → returns false.
 * - setBiometricEnabled(): persists user preference in MMKV.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

import { getBiometricEnabled, setBiometricEnabled } from '../lib/secure-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseBiometricReturn {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  authenticate: () => Promise<boolean>;
  enableBiometric: (enabled: boolean) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;

export function useBiometric(): UseBiometricReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;

      if (!mounted) return;

      setIsAvailable(available);
      setIsEnabled(getBiometricEnabled());

      if (available) {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (mounted) setBiometricTypes(types);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquea Finanzas',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
      });

      if (result.success) return true;

      attempts += 1;

      // If user explicitly cancelled, don't keep retrying
      if (result.error === 'user_cancel' || result.error === 'system_cancel') {
        return false;
      }
    }

    // Exceeded max attempts → caller must fall back to password
    return false;
  }, [isAvailable]);

  const enableBiometric = useCallback((enabled: boolean) => {
    setBiometricEnabled(enabled);
    setIsEnabled(enabled);
  }, []);

  return { isAvailable, isEnabled, biometricTypes, authenticate, enableBiometric };
}
