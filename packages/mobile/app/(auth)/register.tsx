import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
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
import { type RegisterFormData, registerSchema } from '@/schemas/auth.schemas';
import { useAuthStore } from '@/stores/auth.store';

export default function RegisterScreen(): React.JSX.Element {
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const acceptTerms = watch('acceptTerms');

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      clearError();
      try {
        // firstName / lastName will be gathered in profile setup (Fase 2)
        // For now we derive them from email
        const emailName = data.email.split('@')[0] ?? 'Usuario';
        await register(data.email, data.password, emailName, '');
        router.replace('/(app)/(tabs)');
      } catch {
        // Error is stored in Zustand
      }
    },
    [register, clearError],
  );

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
          <View className="mb-8 mt-8">
            <Text
              className="text-white text-3xl font-bold mb-2"
              accessibilityRole="header"
            >
              Crear cuenta
            </Text>
            <Text className="text-slate-400 text-base">
              Comienza a controlar tus finanzas
            </Text>
          </View>

          {/* Form */}
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
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                placeholder="Mínimo 8 caracteres"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <FormField
                ref={confirmRef}
                label="Confirmar contraseña"
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
                required
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                placeholder="Repite tu contraseña"
              />
            )}
          />

          {/* Terms & Conditions checkbox */}
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field: { onChange, value } }) => (
              <Pressable
                onPress={() => onChange(!value)}
                accessible
                accessibilityRole="checkbox"
                accessibilityLabel="Aceptar términos y condiciones"
                accessibilityState={{ checked: value }}
                className="flex-row items-start mb-4"
              >
                <View
                  className={[
                    'w-5 h-5 rounded border-2 mr-3 mt-0.5 items-center justify-center',
                    value
                      ? 'bg-sky-500 border-sky-500'
                      : 'bg-transparent border-slate-600',
                  ].join(' ')}
                >
                  {value && (
                    <Text className="text-white text-xs font-bold">✓</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-slate-300 text-sm leading-5">
                    Acepto los{' '}
                    <Text className="text-sky-400 underline">
                      Términos y Condiciones
                    </Text>{' '}
                    y la{' '}
                    <Text className="text-sky-400 underline">
                      Política de Privacidad
                    </Text>
                  </Text>
                  {errors.acceptTerms?.message !== undefined && (
                    <Text
                      className="text-red-400 text-xs mt-1"
                      accessibilityRole="alert"
                    >
                      {errors.acceptTerms.message}
                    </Text>
                  )}
                </View>
              </Pressable>
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

          {/* Submit */}
          <Button
            label="Crear cuenta"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            disabled={!isValid || !acceptTerms}
            accessibilityLabel="Crear cuenta"
            accessibilityHint="Crea tu cuenta con el email y contraseña ingresados"
          />

          {/* Login link */}
          <View className="flex-row justify-center mt-8 mb-4">
            <Text className="text-slate-400 text-sm">¿Ya tienes cuenta? </Text>
            <Link href="/(auth)/login" asChild accessibilityRole="link">
              <Pressable>
                <Text className="text-sky-400 text-sm font-medium">
                  Inicia sesión
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
