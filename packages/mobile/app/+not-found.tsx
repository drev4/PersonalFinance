import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Página no encontrada' }} />
      <View className="flex-1 items-center justify-center bg-slate-900 p-4">
        <Text className="text-white text-xl font-bold">Esta pantalla no existe.</Text>
        <Link href="/(app)/(tabs)" className="mt-4">
          <Text className="text-sky-400 text-base underline">Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}
