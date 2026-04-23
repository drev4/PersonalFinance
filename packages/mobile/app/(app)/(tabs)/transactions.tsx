import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TransactionsScreen(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-white text-xl font-semibold">Movimientos</Text>
        <Text className="text-slate-400 text-sm mt-2">Próximamente</Text>
      </View>
    </SafeAreaView>
  );
}
