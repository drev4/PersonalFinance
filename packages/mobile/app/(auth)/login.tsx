import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useLogin } from '@/api/auth';
import { checkBackendHealth } from '@/api/health';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backendStatus, setBackendStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const { mutate: login, isPending, error } = useLogin();

  useEffect(() => {
    checkBackendHealth().then(setBackendStatus);
  }, []);

  const handleLogin = () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    login({ email, password });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
        <Text style={styles.title}>Finanzas</Text>
        <Text style={styles.subtitle}>Manage your finances</Text>

        {!backendStatus?.ok && (
          <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Backend no disponible</Text>
          <Text style={styles.warningText}>
            No se puede conectar a {process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}
          </Text>
          <Text style={styles.warningText}>Error: {backendStatus?.error}</Text>
          <Text style={styles.warningHint}>Asegúrate de que el backend está corriendo:</Text>
          <Text style={styles.warningCode}>cd packages/api && npm run dev</Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            editable={!isPending}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            editable={!isPending}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {error && <Text style={styles.error}>{(error as any).message || 'Login failed'}</Text>}

        <TouchableOpacity
          style={[styles.button, isPending && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Don&apos;t have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
  },
  link: {
    color: '#0066CC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 6,
    marginVertical: 16,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 6,
  },
  warningHint: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 8,
    fontWeight: '500',
  },
  warningCode: {
    fontSize: 11,
    color: '#92400E',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
    borderRadius: 4,
    fontFamily: 'Courier New',
  },
});
