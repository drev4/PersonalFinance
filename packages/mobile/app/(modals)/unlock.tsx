/**
 * Unlock screen — shown when the app has been backgrounded for >5 minutes.
 * - Tries biometric authentication first.
 * - Falls back to password input.
 * - After 5 failed attempts (combined): full logout.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { useBiometric } from '@/hooks/useBiometric';
import { type UnlockFormData, unlockSchema } from '@/schemas/auth.schemas';
import { useAuthStore } from '@/stores/auth.store';

const MAX_TOTAL_ATTEMPTS = 5;

export default function UnlockScreen(): React.JSX.Element {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, authenticate } =
    useBiometric();

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const hasTriedBiometric = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<UnlockFormData>({
    resolver: zodResolver(unlockSchema),
    mode: 'onChange',
    defaultValues: { password: '' },
  });

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (biometricAvailable && biometricEnabled && !hasTriedBiometric.current) {
      hasTriedBiometric.current = true;
      void tryBiometric();
    } else if (!biometricAvailable || !biometricEnabled) {
      setShowPasswordFallback(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable, biometricEnabled]);

  const handleTooManyAttempts = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout]);

  const tryBiometric = useCallback(async () => {
    const success = await authenticate();
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(app)/(tabs)');
    } else {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      if (next >= MAX_TOTAL_ATTEMPTS) {
        await handleTooManyAttempts();
      } else {
        setShowPasswordFallback(true);
        setUnlockError('Biometría fallida. Ingresa tu contraseña.');
      }
    }
  }, [authenticate, failedAttempts, handleTooManyAttempts]);

  const onPasswordSubmit = useCallback(
    async (data: UnlockFormData) => {
      if (!user?.email) {
        setUnlockError('Error interno. Por favor, inicia sesión de nuevo.');
        return;
      }

      setIsLoading(true);
      setUnlockError(null);

      try {
        // Re-authenticate via API to verify password
        await apiClient.post('/auth/login', {
          email: user.email,
          password: data.password,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(app)/(tabs)');
      } catch {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (next >= MAX_TOTAL_ATTEMPTS) {
          await handleTooManyAttempts();
        } else {
          setUnlockError(
            `Contraseña incorrecta. ${MAX_TOTAL_ATTEMPTS - next} intentos restantes.`,
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user, failedAttempts, handleTooManyAttempts],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 items-center justify-center px-6">
          {/* App icon / lock indicator */}
          <View className="w-20 h-20 rounded-full bg-sky-500/20 items-center justify-center mb-8">
            <Text className="text-4xl">🔒</Text>
          </View>

          <Text
            className="text-white text-2xl font-bold mb-2 text-center"
            accessibilityRole="header"
          >
            Sesión bloqueada
          </Text>
          <Text className="text-slate-400 text-base text-center mb-10">
            Verifica tu identidad para continuar
          </Text>

          {/* Biometric button */}
          {biometricAvailable && biometricEnabled && (
            <Button
              label="Desbloquear con Face ID / Touch ID"
              onPress={tryBiometric}
              isLoading={isLoading && !showPasswordFallback}
              style={{ width: '100%', marginBottom: 16 }}
              accessibilityLabel="Desbloquear con biometría"
              accessibilityHint="Usa Face ID o Touch ID para desbloquear la app"
            />
          )}

          {/* Password fallback */}
          {showPasswordFallback && (
            <>
              {unlockError !== null && (
                <View className="bg-red-900/40 rounded-xl px-4 py-3 mb-4 w-full">
                  <Text
                    className="text-red-300 text-sm text-center"
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                  >
                    {unlockError}
                  </Text>
                </View>
              )}

              <View className="w-full">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <FormField
                      label="Contraseña"
                      value={value}
                      onChangeText={onChange}
                      error={errors.password?.message}
                      required
                      secureTextEntry
                      autoComplete="password"
                      textContentType="password"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onPasswordSubmit)}
                      placeholder="••••••••"
                    />
                  )}
                />

                <Button
                  label="Desbloquear"
                  onPress={handleSubmit(onPasswordSubmit)}
                  isLoading={isLoading}
                  disabled={!isValid}
                  accessibilityLabel="Desbloquear con contraseña"
                />
              </View>
            </>
          )}

          {/* Show password option if only biometric shown */}
          {!showPasswordFallback && biometricAvailable && biometricEnabled && (
            <Button
              label="Usar contraseña"
              onPress={() => setShowPasswordFallback(true)}
              variant="ghost"
              style={{ marginTop: 8 }}
              accessibilityLabel="Cambiar a contraseña"
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
