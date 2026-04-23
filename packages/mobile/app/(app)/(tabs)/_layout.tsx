/**
 * Tab layout with central FAB.
 * 4 tabs: Home, Transactions, Portfolio, Settings.
 * Central FAB floats above the tab bar (Revolut/N26 style).
 */

import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Home, List, PieChart, Settings } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarFAB } from '@/components/TabBarFAB';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_COLOR = '#0ea5e9'; // sky-500
const INACTIVE_COLOR = '#64748b'; // slate-500
const TAB_BAR_BG = '#1e293b'; // slate-800
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 83 : 60;

// ─── Icon components ──────────────────────────────────────────────────────────

function HomeIcon({ color }: { color: string }): React.JSX.Element {
  return <Home size={22} color={color} strokeWidth={2} />;
}

function ListIcon({ color }: { color: string }): React.JSX.Element {
  return <List size={22} color={color} strokeWidth={2} />;
}

function PieChartIcon({ color }: { color: string }): React.JSX.Element {
  return <PieChart size={22} color={color} strokeWidth={2} />;
}

function SettingsIcon({ color }: { color: string }): React.JSX.Element {
  return <Settings size={22} color={color} strokeWidth={2} />;
}

// ─── Tab bar with FAB wrapper ─────────────────────────────────────────────────

function TabBarWithFAB({ onFABPress }: { onFABPress: () => void }): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_BAR_HEIGHT + insets.bottom,
      }}
      pointerEvents="box-none"
    >
      <TabBarFAB onPress={onFABPress} />
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout(): React.JSX.Element {
  const handleFABPress = useCallback(() => {
    void Haptics.selectionAsync();
    // Fase 3: open quick-add modal
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: ACTIVE_COLOR,
            tabBarInactiveTintColor: INACTIVE_COLOR,
            tabBarStyle: {
              backgroundColor: TAB_BAR_BG,
              borderTopColor: '#334155',
              borderTopWidth: 1,
              height: TAB_BAR_HEIGHT,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
              marginBottom: Platform.OS === 'android' ? 4 : 0,
            },
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Inicio',
              tabBarLabel: 'Inicio',
              tabBarIcon: HomeIcon,
              tabBarAccessibilityLabel: 'Inicio',
            }}
          />

          <Tabs.Screen
            name="transactions"
            options={{
              title: 'Movimientos',
              tabBarLabel: 'Movimientos',
              tabBarIcon: ListIcon,
              tabBarAccessibilityLabel: 'Movimientos',
            }}
          />

          {/* FAB spacer tab — invisible, just occupies center slot */}
          <Tabs.Screen
            name="_fab_spacer"
            options={{
              tabBarLabel: '',
              tabBarIcon: () => null,
              tabBarButton: () => (
                <View style={{ flex: 1 }} pointerEvents="none" />
              ),
              href: null,
            }}
          />

          <Tabs.Screen
            name="portfolio"
            options={{
              title: 'Portafolio',
              tabBarLabel: 'Portafolio',
              tabBarIcon: PieChartIcon,
              tabBarAccessibilityLabel: 'Portafolio',
            }}
          />

          <Tabs.Screen
            name="settings"
            options={{
              title: 'Ajustes',
              tabBarLabel: 'Ajustes',
              tabBarIcon: SettingsIcon,
              tabBarAccessibilityLabel: 'Ajustes',
            }}
          />
        </Tabs>

        {/* FAB rendered above the tab bar, outside Tabs */}
        <TabBarWithFAB onFABPress={handleFABPress} />
      </View>
    </GestureHandlerRootView>
  );
}
