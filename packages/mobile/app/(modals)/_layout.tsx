import { Stack } from 'expo-router';
import React from 'react';

export default function ModalsLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen name="unlock" />
      <Stack.Screen
        name="quick-add"
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          // Allow swipe-down to dismiss on iOS
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen
        name="transaction-filters"
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
    </Stack>
  );
}
