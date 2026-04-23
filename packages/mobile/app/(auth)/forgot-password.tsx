import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
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
import {
  type ConfirmCodeFormData,
  type ForgotPasswordFormData,
  confirmCodeSchema,
  forgotPasswordSchema,
} from '@/schemas/auth.schemas';

type Step = 'email' | 'code';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const [step, setStep] = useState<Step>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const codeRef = useRef<TextInput>(null);

  // ── Step 1: Email form ─────────────────────────────────────────────────────

  const emailForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const onRequestReset = useCallback(
    async (data: ForgotPasswordFormData) => {
      setServerError(null);
      setIsLoading(true);
      try {
        await apiClient.post('/auth/forgot-password', { email: data.email });
        setPendingEmail(data.email);
        setStep('code');
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : 'Error al enviar el email',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // ── Step 2: Code confirmation form ────────────────────────────────────────

  const codeForm = useForm<ConfirmCodeFormData>({
    resolver: zodResolver(confirmCodeSchema),
    mode: 'onChange',
    defaultValues: { code: '' },
  });

  const onConfirmCode = useCallback(
    (data: ConfirmCodeFormData) => {
      setServerError(null);
      setIsLoading(true);
      try {
        // Navigate to reset screen; actual code validation happens there
        router.push({
          pathname: '/(auth)/reset-password',
          params: { email: pendingEmail, code: data.code },
        });
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : 'Código inválido',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [pendingEmail],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

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
          {/* Back */}
          <Button
            label="← Volver"
            onPress={() =>
              step === 'code' ? setStep('email') : router.back()
            }
            variant="ghost"
            style={{ alignSelf: 'flex-start', marginBottom: 16 }}
            accessibilityLabel="Volver"
          />

          {step === 'email' ? (
            <>
              <View className="mb-8">
                <Text
                  className="text-white text-3xl font-bold mb-2"
                  accessibilityRole="header"
                >
                  Recuperar contraseña
                </Text>
                <Text className="text-slate-400 text-base">
                  Te enviaremos un código de verificación
                </Text>
              </View>

              <Controller
                control={emailForm.control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    error={emailForm.formState.errors.email?.message}
                    required
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={emailForm.handleSubmit(onRequestReset)}
                    placeholder="tu@email.com"
                  />
                )}
              />

              {serverError !== null && (
                <View className="bg-red-900/40 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-red-300 text-sm" accessibilityRole="alert">
                    {serverError}
                  </Text>
                </View>
              )}

              <Button
                label="Enviar código"
                onPress={emailForm.handleSubmit(onRequestReset)}
                isLoading={isLoading}
                disabled={!emailForm.formState.isValid}
                accessibilityLabel="Enviar código de verificación"
              />
            </>
          ) : (
            <>
              <View className="mb-8">
                <Text
                  className="text-white text-3xl font-bold mb-2"
                  accessibilityRole="header"
                >
                  Ingresa el código
                </Text>
                <Text className="text-slate-400 text-base">
                  Enviamos un código de 6 dígitos a {pendingEmail}
                </Text>
              </View>

              <Controller
                control={codeForm.control}
                name="code"
                render={({ field: { onChange, value } }) => (
                  <FormField
                    ref={codeRef}
                    label="Código de verificación"
                    value={value}
                    onChangeText={onChange}
                    error={codeForm.formState.errors.code?.message}
                    required
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={codeForm.handleSubmit(onConfirmCode)}
                    placeholder="123456"
                  />
                )}
              />

              {serverError !== null && (
                <View className="bg-red-900/40 rounded-xl px-4 py-3 mb-4">
                  <Text className="text-red-300 text-sm" accessibilityRole="alert">
                    {serverError}
                  </Text>
                </View>
              )}

              <Button
                label="Verificar código"
                onPress={codeForm.handleSubmit(onConfirmCode)}
                isLoading={isLoading}
                disabled={!codeForm.formState.isValid}
                accessibilityLabel="Verificar código de recuperación"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
