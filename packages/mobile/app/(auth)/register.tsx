import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useRegister } from '@/api/auth';
import { ChevronLeft } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '@/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { mutate: register, isPending, error } = useRegister();

  const handleRegister = () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor rellena todos los campos');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      Alert.alert('Error', 'El correo electrónico no es válido');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    register({ name, email, password });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Empieza a gestionar tus finanzas</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              editable={!isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
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
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              editable={!isPending}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isPending}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {(error as Error).message || 'Error al crear la cuenta'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isPending && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? </Text>
            <Text style={styles.loginLinkBold}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadow.sm,
  },
  headerSection: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.largeTitle,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
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
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  loginLinkText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  loginLinkBold: {
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
});
