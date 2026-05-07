import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useConnectivityMonitor } from '@/stores/connectivityStore';
import { useLoadConfig, useConfigStore } from '@/stores/configStore';
import { darkColors, lightColors } from '@/theme';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const systemScheme = useColorScheme();
  const { isDark: manualIsDark, themeFollowsSystem, biometricEnabled } = useConfigStore();
  const isDark = themeFollowsSystem ? systemScheme === 'dark' : manualIsDark;
  const themeColors = isDark ? darkColors : lightColors;

  const isLoading = useAuthStore((state) => state.isLoading);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const biometricPassed = useAuthStore((state) => state.biometricPassed);
  const restoreTokens = useAuthStore((state) => state.restoreTokens);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  useConnectivityMonitor();
  useLoadConfig();

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await Promise.all([restoreTokens(), useConfigStore.getState().loadConfig()]);
      setIsLoading(false);
    };

    initAuth();
  }, [restoreTokens, setIsLoading]);

  useEffect(() => {
    if (isLoading || !navigationState?.key) return;

    const timer = setTimeout(() => {
      const hasToken = !!accessToken || !!refreshToken;
      const isAuthRoute = segments[0] === '(auth)';
      const needsBiometric = biometricEnabled && !biometricPassed;

      if (hasToken && !isAuthRoute && needsBiometric) {
        // Tokens exist but biometric not yet verified — lock to login screen
        router.replace('/(auth)/login');
      } else if (hasToken && isAuthRoute && !needsBiometric) {
        router.replace('/(app)/(tabs)');
      } else if (!hasToken && !isAuthRoute) {
        router.replace('/(auth)/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [
    accessToken,
    refreshToken,
    isLoading,
    biometricEnabled,
    biometricPassed,
    navigationState?.key,
    segments,
    router,
  ]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: themeColors.bg,
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
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
