import { View, Text, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardSummary } from '@/api/dashboard';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/formatters';
import { useState } from 'react';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, refetch } = useDashboardSummary();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Format current date with Spanish localization
  const getFormattedDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
  };

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Skeleton width="30%" height={16} marginBottom={8} />
          <Skeleton width="50%" height={20} marginBottom={0} />
        </View>
        <SkeletonGroup />
        <SkeletonGroup />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const getVariationColor = (change: number) => (change >= 0 ? '#10B981' : '#EF4444');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user?.name || 'Usuario'}</Text>
        <Text style={styles.subtitle}>{getFormattedDate()}</Text>
      </View>

      {/* Patrimonio Neto */}
      <View style={styles.netWorthCard}>
        <Text style={styles.netWorthLabel}>Patrimonio Neto</Text>
        <Text style={styles.netWorthAmount}>{formatCurrency(data?.netWorth || 0)}</Text>
        <View style={styles.variationRow}>
          <Text style={[styles.variation, { color: getVariationColor(data?.netWorthChange24h || 0) }]}>
            24h: {data?.netWorthChange24h && data.netWorthChange24h >= 0 ? '+' : ''}{data?.netWorthChange24h.toFixed(2)}%
          </Text>
          <Text style={[styles.variation, { color: getVariationColor(data?.netWorthChange30d || 0) }]}>
            30d: {data?.netWorthChange30d && data.netWorthChange30d >= 0 ? '+' : ''}{data?.netWorthChange30d.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Sparkline Placeholder */}
      <View style={styles.sparklineContainer}>
        <Text style={styles.sectionTitle}>Últimos 30 días</Text>
        <View style={styles.sparklineChart}>
          <Text style={styles.chartPlaceholder}>📈 Gráfico aquí</Text>
        </View>
      </View>

      {/* Top Accounts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuentas Principales</Text>
        <FlatList
          data={data?.topAccounts || []}
          keyExtractor={(item) => item.id}
          horizontal
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.accountCard}>
              <Text style={styles.accountName}>{item.name}</Text>
              <Text style={styles.accountBalance}>{formatCurrency(item.balance)}</Text>
            </View>
          )}
        />
      </View>

      {/* Monthly Expense */}
      <View style={styles.section}>
        <View style={styles.expenseHeader}>
          <Text style={styles.sectionTitle}>Gasto del Mes</Text>
          <Text style={styles.expenseAmount}>{formatCurrency(data?.monthlyExpense || 0)}</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(((data?.monthlyExpense || 0) / (data?.monthlyBudget || 1)) * 100, 100)}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.budgetText}>
          Presupuesto: {formatCurrency(data?.monthlyBudget || 0)}
        </Text>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimos Movimientos</Text>
        {data?.recentTransactions && data.recentTransactions.length > 0 ? (
          data.recentTransactions.slice(0, 5).map((transaction, idx) => (
            <View key={transaction.id || `tx-${idx}`} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>{transaction.description}</Text>
                <Text style={styles.transactionDate}>{new Date(transaction.date).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: transaction.type === 'income' ? '#10B981' : '#000' }]}>
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No hay movimientos recientes</Text>
        )}
      </View>

      <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  netWorthCard: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#0066CC',
    borderRadius: 12,
  },
  netWorthLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  netWorthAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginVertical: 8,
  },
  variationRow: {
    flexDirection: 'row',
    gap: 16,
  },
  variation: {
    fontSize: 12,
    fontWeight: '600',
  },
  sparklineContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  sparklineChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 12,
  },
  chartPlaceholder: {
    fontSize: 24,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  accountCard: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 8,
    minWidth: 120,
  },
  accountName: {
    fontSize: 12,
    color: '#666',
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  budgetText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
