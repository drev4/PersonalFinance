import { View, Text, StyleSheet } from 'react-native';
import { useConnectivityStore } from '@/stores/connectivityStore';

export const OfflineBanner = () => {
  const isOnline = useConnectivityStore((state) => state.isOnline);

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ Sin conexión - Usando datos en caché</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
});
