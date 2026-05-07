import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  ArrowRightLeft,
  Bell,
  Calculator,
  ChartPie,
  FileText,
  Home,
  Landmark,
  Plus,
  Repeat2,
  Search,
  Settings,
  Target,
  Wallet,
} from 'lucide-react-native';
import { useUnreadCount } from '@/api/notifications';
import { colors, radius, shadow } from '@/theme';

const createIcon = (Icon: React.ElementType) => {
  const TabIcon = ({ color, size }: { color: string; size: number }) => (
    <Icon size={size} color={color} strokeWidth={1.8} />
  );
  TabIcon.displayName = 'TabIcon';
  return TabIcon;
};

export default function TabLayout() {
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const unreadBadge = unreadData && unreadData.count > 0 ? unreadData.count : undefined;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: styles.tabLabel,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: createIcon(Home) }} />
        <Tabs.Screen
          name="transactions"
          options={{ title: 'Movimientos', tabBarIcon: createIcon(ArrowRightLeft) }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{ title: 'Cartera', tabBarIcon: createIcon(Wallet) }}
        />
        <Tabs.Screen
          name="reports"
          options={{ title: 'Informes', tabBarIcon: createIcon(FileText) }}
        />
        <Tabs.Screen
          name="budgets"
          options={{ title: 'Presupuestos', tabBarIcon: createIcon(ChartPie) }}
        />
        <Tabs.Screen name="goals" options={{ title: 'Metas', tabBarIcon: createIcon(Target) }} />
        <Tabs.Screen
          name="accounts"
          options={{ title: 'Cuentas', tabBarIcon: createIcon(Landmark) }}
        />
        <Tabs.Screen
          name="recurring"
          options={{ title: 'Recurrentes', tabBarIcon: createIcon(Repeat2) }}
        />
        <Tabs.Screen name="search" options={{ title: 'Buscar', tabBarIcon: createIcon(Search) }} />
        <Tabs.Screen
          name="simulators"
          options={{ title: 'Simuladores', tabBarIcon: createIcon(Calculator) }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarBadge: unreadBadge,
            tabBarIcon: createIcon(Bell),
            title: 'Notificaciones',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Ajustes', tabBarIcon: createIcon(Settings) }}
        />
      </Tabs>

      <TouchableOpacity
        style={styles.fab}
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
  tabBar: {
    borderTopWidth: 0,
    backgroundColor: colors.card,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    ...shadow.md,
    shadowOffset: { width: 0, height: -4 },
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
