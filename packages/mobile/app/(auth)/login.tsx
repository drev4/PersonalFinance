import { zodResolver } from '@hookform/resolvers/zod';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { useBiometric } from '@/hooks/useBiometric';
import { setBiometricEnabled } from '@/lib/secure-storage';
import { type LoginFormData, loginSchema } from '@/schemas/auth.schemas';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginScreen(): React.JSX.Element {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const { isAvailable: biometricAvailable, authenticate } = useBiometric();

  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      clearError();
      try {
        await login(data.email, data.password);
        // Show biometric prompt if biometrics are available and not yet enabled
        if (biometricAvailable) {
          setShowBiometricModal(true);
        } else {
          router.replace('/(app)/(tabs)');
        }
      } catch {
        // Error is stored in Zustand; displayed below
      }
    },
    [login, clearError, biometricAvailable],
  );

  const handleEnableBiometric = useCallback(async () => {
    setShowBiometricModal(false);
    setBiometricEnabled(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(app)/(tabs)');
  }, []);

  const handleSkipBiometric = useCallback(() => {
    setShowBiometricModal(false);
    router.replace('/(app)/(tabs)');
  }, []);

  const handleBiometricLogin = useCallback(async () => {
    const success = await authenticate();
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(app)/(tabs)');
    }
  }, [authenticate]);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-10 mt-8">
            <Text
              className="text-white text-3xl font-bold mb-2"
              accessibilityRole="header"
            >
              Bienvenido
            </Text>
            <Text className="text-slate-400 text-base">
              Inicia sesión en tu cuenta
            </Text>
          </View>

          {/* Form */}
          <View className="flex-1">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <FormField
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  required
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholder="tu@email.com"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <FormField
                  ref={passwordRef}
                  label="Contraseña"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  required
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  placeholder="••••••••"
                />
              )}
            />

            {/* Global error */}
            {storeError !== null && (
              <View className="bg-red-900/40 rounded-xl px-4 py-3 mb-4">
                <Text
                  className="text-red-300 text-sm"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
                  {storeError}
                </Text>
              </View>
            )}

            {/* Forgot password */}
            <Link
              href="/(auth)/forgot-password"
              asChild
              accessibilityRole="link"
            >
              <Pressable className="mb-6">
                <Text className="text-sky-400 text-sm text-right">
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>
            </Link>

            {/* Submit */}
            <Button
              label="Iniciar sesión"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              disabled={!isValid}
              accessibilityLabel="Iniciar sesión"
              accessibilityHint="Inicia sesión con tu email y contraseña"
            />

            {/* Biometric quick login */}
            {biometricAvailable && (
              <Button
                label="Usar Face ID / Touch ID"
                onPress={handleBiometricLogin}
                variant="ghost"
                style={{ marginTop: 12 }}
                accessibilityLabel="Iniciar sesión con biometría"
              />
            )}

            {/* Register link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-slate-400 text-sm">
                ¿No tienes cuenta?{' '}
              </Text>
              <Link href="/(auth)/register" asChild accessibilityRole="link">
                <Pressable>
                  <Text className="text-sky-400 text-sm font-medium">
                    Regístrate
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Biometric opt-in modal */}
      <Modal
        visible={showBiometricModal}
        transparent
        animationType="slide"
        onRequestClose={handleSkipBiometric}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-800 rounded-t-3xl p-6">
            <Text
              className="text-white text-xl font-bold mb-2 text-center"
              accessibilityRole="header"
            >
              Desbloqueo rápido
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-6">
              ¿Deseas usar Face ID o Touch ID para acceder más rápido la
              próxima vez?
            </Text>
            <Button
              label="Activar Face ID / Touch ID"
              onPress={handleEnableBiometric}
              accessibilityLabel="Activar autenticación biométrica"
            />
            <Button
              label="Ahora no"
              onPress={handleSkipBiometric}
              variant="ghost"
              style={{ marginTop: 8 }}
              accessibilityLabel="Omitir activación biométrica"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
