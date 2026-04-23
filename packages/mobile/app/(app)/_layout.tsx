/**
 * (app) layout — auth guard.
 * Redirects to (auth)/login if the user is not authenticated.
 */

import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth.store';

export default function AppLayout(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
