import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ArrowRightLeft, Home, LayoutGrid, Plus, Wallet } from 'lucide-react-native';
import { radius } from '@/theme';
import { useTheme } from '@/theme/useTheme';

const createIcon = (Icon: React.ElementType) => {
  const TabIcon = ({ color, size }: { color: string; size: number }) => (
    <Icon size={size} color={color} strokeWidth={1.8} />
  );
  TabIcon.displayName = 'TabIcon';
  return TabIcon;
};

export default function TabLayout() {
  const router = useRouter();
  const { colors, shadow } = useTheme();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            borderTopWidth: 0,
            backgroundColor: colors.card,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
            ...shadow.md,
            shadowOffset: { width: 0, height: -4 },
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: styles.tabLabel,
          tabBarShowLabel: false,
        }}
      >
        {/* ── Visible tabs ─────────────────────────────────────────────────── */}
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: createIcon(Home) }} />
        <Tabs.Screen
          name="transactions"
          options={{ title: 'Movimientos', tabBarIcon: createIcon(ArrowRightLeft) }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{ title: 'Cartera', tabBarIcon: createIcon(Wallet) }}
        />
        <Tabs.Screen name="more" options={{ title: 'Más', tabBarIcon: createIcon(LayoutGrid) }} />

        {/* ── Hidden tabs — accessible via router but no tab button ─────────── */}
        <Tabs.Screen name="accounts" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="budgets" options={{ href: null }} />
        <Tabs.Screen name="goals" options={{ href: null }} />
        <Tabs.Screen name="recurring" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="simulators" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>

      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
        onPress={() => router.push('/(modals)/quick-add')}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
