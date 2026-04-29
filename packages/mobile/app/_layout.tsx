import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useConnectivityMonitor } from '@/stores/connectivityStore';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const isLoading = useAuthStore((state) => state.isLoading);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const restoreTokens = useAuthStore((state) => state.restoreTokens);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  useConnectivityMonitor();

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await restoreTokens();
      setIsLoading(false);
    };

    initAuth();
  }, [restoreTokens, setIsLoading]);

  useEffect(() => {
    if (isLoading || !navigationState?.key) return;

    const timer = setTimeout(() => {
      const hasToken = !!accessToken || !!refreshToken;
      const isAuthRoute = segments[0] === '(auth)';

      if (hasToken && isAuthRoute) {
        router.replace('/(app)/(tabs)');
      } else if (!hasToken && !isAuthRoute) {
        router.replace('/(auth)/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [accessToken, refreshToken, isLoading, navigationState?.key, segments, router]);

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}
      >
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
