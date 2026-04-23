import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { type ResetPasswordFormData, resetPasswordSchema } from '@/schemas/auth.schemas';

interface ResetParams extends Record<string, string> {
  email: string;
  code: string;
}

export default function ResetPasswordScreen(): React.JSX.Element {
  const { email, code } = useLocalSearchParams<ResetParams>();

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const confirmRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(
    async (data: ResetPasswordFormData) => {
      setServerError(null);
      setIsLoading(true);
      try {
        await apiClient.post('/auth/reset-password', {
          email,
          code,
          newPassword: data.password,
        });
        setSuccess(true);
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : 'Error al cambiar la contraseña',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [email, code],
  );

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center px-6">
        <Text
          className="text-white text-3xl font-bold mb-4 text-center"
          accessibilityRole="header"
        >
          Contraseña actualizada
        </Text>
        <Text className="text-slate-400 text-base text-center mb-8">
          Tu contraseña fue cambiada exitosamente. Ya puedes iniciar sesión.
        </Text>
        <Button
          label="Ir a iniciar sesión"
          onPress={() => router.replace('/(auth)/login')}
          accessibilityLabel="Ir a la pantalla de inicio de sesión"
        />
      </SafeAreaView>
    );
  }

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
          <Button
            label="← Volver"
            onPress={() => router.back()}
            variant="ghost"
            style={{ alignSelf: 'flex-start', marginBottom: 16 }}
            accessibilityLabel="Volver"
          />

          <View className="mb-8 mt-4">
            <Text
              className="text-white text-3xl font-bold mb-2"
              accessibilityRole="header"
            >
              Nueva contraseña
            </Text>
            <Text className="text-slate-400 text-base">
              Elige una contraseña segura para tu cuenta
            </Text>
          </View>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <FormField
                label="Nueva contraseña"
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
                placeholder="Repite tu nueva contraseña"
              />
            )}
          />

          {serverError !== null && (
            <View className="bg-red-900/40 rounded-xl px-4 py-3 mb-4">
              <Text
                className="text-red-300 text-sm"
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                {serverError}
              </Text>
            </View>
          )}

          <Button
            label="Cambiar contraseña"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            disabled={!isValid}
            accessibilityLabel="Cambiar contraseña"
            accessibilityHint="Actualiza tu contraseña con los valores ingresados"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
