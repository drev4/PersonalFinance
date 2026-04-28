import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Home, ArrowRightLeft, Wallet, Settings, Plus } from 'lucide-react-native';

const createIcon = (Icon: React.ElementType) => {
  const TabIcon = ({ color, size }: { color: string; size: number }) => (
    <Icon size={size} color={color} strokeWidth={2} />
  );
  TabIcon.displayName = 'TabIcon';
  return TabIcon;
};

export default function TabLayout() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: createIcon(Home),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Movimientos',
          tabBarIcon: createIcon(ArrowRightLeft),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Cartera',
          tabBarIcon: createIcon(Wallet),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: createIcon(Settings),
        }}
      />
      </Tabs>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(modals)/quick-add')}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    height: 60,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
