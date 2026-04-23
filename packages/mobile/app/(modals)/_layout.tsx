import { Stack } from 'expo-router';

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
    </Stack>
  );
}
