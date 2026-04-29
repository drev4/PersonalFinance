import { View } from 'react-native';
import { Stack } from 'expo-router';
import { OfflineBanner } from '@/components/OfflineBanner';

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </View>
  );
}
