import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useLogout } from '@/api/auth';
import { useConfigStore } from '@/stores/configStore';
import { useState } from 'react';
import { updateClientBaseURL } from '@/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { apiUrl, setApiUrl } = useConfigStore();
  const [tempUrl, setTempUrl] = useState(apiUrl);
  const [showDebug, setShowDebug] = useState(false);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.replace('/(auth)/login');
      },
    });
  };

  const handleSaveUrl = async () => {
    await setApiUrl(tempUrl);
    updateClientBaseURL(tempUrl);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ajustes</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Debug Panel - tap title 5 times to show */}
      <TouchableOpacity
        onPress={() => setShowDebug(!showDebug)}
        onLongPress={() => setShowDebug(true)}
      >
        <Text style={styles.debugHint}>ℹ️ Mantén presionado para debug</Text>
      </TouchableOpacity>

      {showDebug && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>🔧 API Debug</Text>
          <Text style={styles.debugLabel}>URL del Backend:</Text>
          <TextInput
            style={styles.debugInput}
            value={tempUrl}
            onChangeText={setTempUrl}
            placeholder="http://192.168.x.x:3001"
          />
          <TouchableOpacity style={styles.debugButton} onPress={handleSaveUrl}>
            <Text style={styles.debugButtonText}>Guardar URL</Text>
          </TouchableOpacity>
          <Text style={styles.debugInfo}>URL actual: {apiUrl}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  debugPanel: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  debugLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  debugInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  debugButton: {
    backgroundColor: '#0066CC',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  debugInfo: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
