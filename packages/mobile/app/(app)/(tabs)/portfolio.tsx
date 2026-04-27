import { View, Text, StyleSheet } from 'react-native';

export default function PortfolioScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cartera</Text>
      <Text style={styles.subtitle}>Portfolio will be here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
