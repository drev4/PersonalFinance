/**
 * Root layout.
 *
 * Responsibilities:
 * - Provides QueryClientProvider and initialises Zustand auth store.
 * - Registers the auth store with apiClient (avoids circular imports).
 * - Route guard: unauthenticated → (auth), authenticated → (app).
 * - On cold start: if refreshToken in SecureStore + biometricEnabled
 *   → attempt refresh silently; then navigate to (app).
 * - App state tracking: if app was backgrounded >5 minutes → unlock screen.
 */

import '../src/global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { registerAuthStore } from '../src/api/client';
import {
  getBiometricEnabled,
  getLastActiveAt,
  getRefreshToken,
  setLastActiveAt,
} from '../src/lib/secure-storage';
import { useAuthStore } from '../src/stores/auth.store';

// ─── Constants ────────────────────────────────────────────────────────────────

void SplashScreen.preventAutoHideAsync();

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// ─── Inner component (has access to stores) ───────────────────────────────────

function RootInner(): React.JSX.Element {
  const storeInstance = useAuthStore;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isInitialised = useRef(false);

  // ── Register store with apiClient on first render ─────────────────────────
  useEffect(() => {
    registerAuthStore({
      getAccessToken: () => storeInstance.getState().accessToken,
      getUser: () => storeInstance.getState().user,
      setAccessToken: (token, user) =>
        storeInstance.getState().setAccessToken(token, user),
      logout: () => storeInstance.getState().logout(),
    });
  }, [storeInstance]);

  // ── Cold-start initialisation ──────────────────────────────────────────────
  useEffect(() => {
    if (isInitialised.current) return;
    isInitialised.current = true;

    void (async () => {
      try {
        const storedRefresh = await getRefreshToken();
        const biometricEnabled = getBiometricEnabled();

        if (storedRefresh) {
          // Attempt silent refresh to restore session
          const success = await storeInstance.getState().refreshToken();

          if (success) {
            if (biometricEnabled) {
              // User has biometrics enabled; will be prompted by unlock logic
              router.replace('/(app)/(tabs)');
            } else {
              router.replace('/(app)/(tabs)');
            }
          } else {
            router.replace('/(auth)/login');
          }
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        router.replace('/(auth)/login');
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, [storeInstance]);

  // ── App state → lock on background ────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prevState = appState.current;
        appState.current = nextState;

        if (prevState === 'active' && nextState.match(/inactive|background/)) {
          setLastActiveAt(Date.now());
        }

        if (
          prevState.match(/inactive|background/) &&
          nextState === 'active' &&
          isAuthenticated
        ) {
          const lastActive = getLastActiveAt();
          if (
            lastActive !== undefined &&
            Date.now() - lastActive > LOCK_TIMEOUT_MS
          ) {
            router.push('/(modals)/unlock');
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  return <Slot />;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootInner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
