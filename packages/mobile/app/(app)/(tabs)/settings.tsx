import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

export default function SettingsScreen(): React.JSX.Element {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleLogout = (): void => {
    logout()
      .then(() => router.replace('/(auth)/login'))
      .catch(() => router.replace('/(auth)/login'));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <View className="flex-1 px-6 pt-8">
        <Text
          className="text-white text-2xl font-bold mb-6"
          accessibilityRole="header"
        >
          Ajustes
        </Text>

        {user !== null && (
          <View className="bg-slate-800 rounded-2xl p-4 mb-6">
            <Text className="text-slate-400 text-xs mb-1">Cuenta</Text>
            <Text className="text-white font-medium">{user.email}</Text>
          </View>
        )}

        <View className="flex-1" />

        <Button
          label="Cerrar sesión"
          onPress={handleLogout}
          variant="danger"
          isLoading={isLoading}
          accessibilityLabel="Cerrar sesión"
          accessibilityHint="Cierra tu sesión y te redirige al inicio de sesión"
          style={{ marginBottom: 16 }}
        />
      </View>
    </SafeAreaView>
  );
}
