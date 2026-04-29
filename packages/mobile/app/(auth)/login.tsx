import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useLogin } from '@/api/auth';
import { checkBackendHealth } from '@/api/health';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backendStatus, setBackendStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const { mutate: login, isPending, error } = useLogin();

  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow, isDark), [isDark]);

  useEffect(() => {
    checkBackendHealth().then(setBackendStatus);
  }, []);

  const handleLogin = () => {
    if (!email || !password) {
      alert('Por favor introduce tu email y contraseña');
      return;
    }
    login({ email, password });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.logoMark} />
          <Text style={styles.appName}>Finanzas</Text>
          <Text style={styles.tagline}>Gestiona tus finanzas</Text>
        </View>

        {!backendStatus?.ok && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Backend no disponible</Text>
            <Text style={styles.warningText}>{backendStatus?.error || 'Conectando...'}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              editable={!isPending}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              editable={!isPending}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {(error as Error).message || 'Error al iniciar sesión'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isPending && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLinkText}>¿No tienes cuenta? </Text>
            <Text style={styles.registerLinkBold}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl,
    },
    headerSection: {
      paddingTop: 64,
      paddingBottom: 48,
      alignItems: 'flex-start',
    },
    logoMark: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      marginBottom: spacing.lg,
      ...shadow.md,
    },
    appName: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: spacing.xs,
    },
    tagline: {
      fontSize: 15,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    form: {
      gap: spacing.lg,
    },
    inputGroup: {
      gap: spacing.sm,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: 0.1,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 16,
      fontSize: 16,
      color: colors.text,
      ...shadow.sm,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: 17,
      alignItems: 'center',
      marginTop: spacing.sm,
      ...shadow.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.white,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    registerLink: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    registerLinkText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    registerLinkBold: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
    errorBox: {
      backgroundColor: colors.expenseLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    errorText: {
      color: colors.expense,
      fontSize: 14,
      fontWeight: '500',
    },
    warningBox: {
      backgroundColor: isDark ? '#2A1F00' : '#FFFBEB',
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: '#F59E0B',
    },
    warningTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#FCD34D' : '#92400E',
      marginBottom: 4,
    },
    warningText: {
      fontSize: 12,
      color: isDark ? '#FCD34D' : '#92400E',
    },
  });
}
