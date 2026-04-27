import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Home, ArrowRightLeft, Wallet, Settings } from 'lucide-react-native';

const createIcon = (Icon: React.ElementType) => {
  const TabIcon = ({ color, size }: { color: string; size: number }) => (
    <Icon size={size} color={color} strokeWidth={2} />
  );
  TabIcon.displayName = 'TabIcon';
  return TabIcon;
};

export default function TabLayout() {
  return (
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
  );
}

const styles = StyleSheet.create({
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
});
