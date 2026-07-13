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
import { useState, useEffect, useMemo, useRef } from 'react';
import { Fingerprint } from 'lucide-react-native';
import { useLogin } from '@/api/auth';
import { checkBackendHealth } from '@/api/health';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';
import {
  getBiometricType,
  authenticateWithBiometrics,
  type BiometricType,
} from '@/hooks/useBiometrics';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backendStatus, setBackendStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState(false);
  const [forceShowForm, setForceShowForm] = useState(false);
  const autoTriggered = useRef(false);
  const { mutate: login, isPending, error } = useLogin();

  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow, isDark), [colors, shadow, isDark]);
  // isDark used for keyboardAppearance and lock-screen subtitle

  const { biometricEnabled } = useConfigStore();
  const { accessToken, biometricPassed, setBiometricPassed } = useAuthStore();

  // Lock mode: hay sesión activa pero biometría no verificada
  const isLockMode =
    !forceShowForm &&
    biometricEnabled &&
    biometricType !== 'none' &&
    !!accessToken &&
    !biometricPassed;

  useEffect(() => {
    checkBackendHealth().then(setBackendStatus);
    getBiometricType().then(setBiometricType);
  }, []);

  // Auto-disparar Face ID la primera vez que entra en modo bloqueo
  useEffect(() => {
    if (isLockMode && !autoTriggered.current) {
      autoTriggered.current = true;
      handleBiometricLogin();
    }
  });

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setBiometricError(false);
    const label = biometricType === 'face' ? 'Face ID' : 'Touch ID';
    const success = await authenticateWithBiometrics(`Accede a Finanzas con ${label}`);
    setBiometricLoading(false);
    if (success) {
      setBiometricPassed(true);
    } else {
      setBiometricError(true);
    }
  };

  const handleLogin = () => {
    if (!email || !password) {
      alert('Por favor introduce tu email y contraseña');
      return;
    }
    login({ email, password });
  };

  // ── Pantalla de bloqueo ────────────────────────────────────────────────────
  if (isLockMode) {
    const biometricLabel = biometricType === 'face' ? 'Face ID' : 'Touch ID';
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.lockScreen}>
          <View style={styles.lockTop}>
            <View style={styles.logoMark} />
            <Text style={styles.appName}>Finanzas</Text>
            <Text style={styles.lockSubtitle}>Verifica tu identidad para continuar</Text>
          </View>

          <View style={styles.lockCenter}>
            <TouchableOpacity
              style={[styles.biometricCircle, biometricLoading && styles.biometricCircleLoading]}
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
              activeOpacity={0.75}
            >
              {biometricLoading ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <Fingerprint
                  size={44}
                  color={biometricError ? colors.expense : colors.primary}
                  strokeWidth={1.5}
                />
              )}
            </TouchableOpacity>

            <Text style={[styles.biometricLabel, biometricError && styles.biometricLabelError]}>
              {biometricLoading
                ? 'Verificando...'
                : biometricError
                ? 'No reconocido. Toca para reintentar'
                : `Toca para usar ${biometricLabel}`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.usePasswordLink}
            onPress={() => setForceShowForm(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.usePasswordText}>Usar contraseña</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pantalla de login normal ───────────────────────────────────────────────
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
              keyboardAppearance={isDark ? 'dark' : 'light'}
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
              keyboardAppearance={isDark ? 'dark' : 'light'}
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

    // ── Lock screen ────────────────────────────────────────────────────────
    lockScreen: {
      flex: 1,
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxl,
      justifyContent: 'space-between',
    },
    lockTop: {
      paddingTop: 72,
      alignItems: 'flex-start',
    },
    lockSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    lockCenter: {
      alignItems: 'center',
      gap: spacing.xl,
    },
    biometricCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.md,
    },
    biometricCircleLoading: {
      opacity: 0.7,
    },
    biometricLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    biometricLabelError: {
      color: colors.expense,
    },
    usePasswordLink: {
      alignSelf: 'center',
      paddingVertical: spacing.md,
    },
    usePasswordText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },

    // ── Login form ─────────────────────────────────────────────────────────
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
