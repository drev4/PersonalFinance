import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardSummary } from '@/api/dashboard';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, error, refetch } = useDashboardSummary();
  const [refreshing, setRefreshing] = useState(false);

  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getFormattedDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
  };

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>No se pudieron cargar los datos</Text>
          <Text style={styles.errorSubtitle}>Comprueba tu conexión e inténtalo de nuevo</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <Skeleton width="30%" height={14} marginBottom={8} />
            <Skeleton width="55%" height={32} marginBottom={0} />
          </View>
          <SkeletonGroup />
          <SkeletonGroup />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const change24h = data?.netWorthChange24h ?? 0;
  const change30d = data?.netWorthChange30d ?? 0;
  const expenseRatio = Math.min(
    ((data?.monthlyExpense || 0) / (data?.monthlyBudget || 1)) * 100,
    100,
  );
  const expenseColor =
    expenseRatio > 85 ? colors.expense : expenseRatio > 60 ? '#F59E0B' : colors.income;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {user?.name || 'Usuario'}</Text>
          <Text style={styles.dateText}>{getFormattedDate()}</Text>
        </View>

        {/* Net Worth Card */}
        <View style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Patrimonio Neto</Text>
          <Text style={styles.netWorthAmount}>{formatCurrency(data?.netWorth || 0)}</Text>
          <View style={styles.variationRow}>
            <View
              style={[
                styles.variationPill,
                { backgroundColor: change24h >= 0 ? colors.incomeLight : colors.expenseLight },
              ]}
            >
              {change24h >= 0 ? (
                <TrendingUp size={11} color={colors.income} />
              ) : (
                <TrendingDown size={11} color={colors.expense} />
              )}
              <Text
                style={[
                  styles.variationText,
                  { color: change24h >= 0 ? colors.income : colors.expense },
                ]}
              >
                {change24h >= 0 ? '+' : ''}
                {change24h.toFixed(2)}% hoy
              </Text>
            </View>
            <View
              style={[
                styles.variationPill,
                { backgroundColor: change30d >= 0 ? colors.incomeLight : colors.expenseLight },
              ]}
            >
              {change30d >= 0 ? (
                <TrendingUp size={11} color={colors.income} />
              ) : (
                <TrendingDown size={11} color={colors.expense} />
              )}
              <Text
                style={[
                  styles.variationText,
                  { color: change30d >= 0 ? colors.income : colors.expense },
                ]}
              >
                {change30d >= 0 ? '+' : ''}
                {change30d.toFixed(2)}% mes
              </Text>
            </View>
          </View>
        </View>

        {/* Chart placeholder */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Últimos 30 días</Text>
          </View>
          <View style={styles.chartArea}>
            <View style={styles.chartBars}>
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.chartBar,
                    { height: h * 0.8, opacity: i === 11 ? 1 : 0.35 + i * 0.05 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Accounts */}
        <View style={styles.accountsSection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.xl }]}>
            Cuentas principales
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.xl }}
          >
            {(data?.topAccounts || []).map((item) => (
              <View key={item.id} style={styles.accountCard}>
                <View style={styles.accountDot} />
                <Text style={styles.accountName}>{item.name}</Text>
                <Text style={styles.accountBalance}>{formatCurrency(item.balance)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Monthly Expense */}
        <View style={styles.card}>
          <View style={styles.expenseHeader}>
            <View>
              <Text style={styles.sectionTitle}>Gasto del mes</Text>
              <Text style={styles.budgetText}>
                Presupuesto: {formatCurrency(data?.monthlyBudget || 0)}
              </Text>
            </View>
            <Text style={[styles.expenseAmount, { color: expenseColor }]}>
              {formatCurrency(data?.monthlyExpense || 0)}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${expenseRatio}%`, backgroundColor: expenseColor },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>0</Text>
            <Text style={styles.progressLabel}>{Math.round(expenseRatio)}%</Text>
            <Text style={styles.progressLabel}>{formatCurrency(data?.monthlyBudget || 0)}</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Últimos movimientos</Text>
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            data.recentTransactions.slice(0, 5).map((tx, idx) => (
              <View
                key={tx.id || `tx-${idx}`}
                style={[styles.txRow, idx === 0 && { marginTop: spacing.md }]}
              >
                <View
                  style={[
                    styles.txIcon,
                    {
                      backgroundColor:
                        tx.type === 'income' ? colors.incomeLight : colors.expenseLight,
                    },
                  ]}
                >
                  <Text style={styles.txIconText}>{tx.type === 'income' ? '↑' : '↓'}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDescription}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString('es-ES')}</Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.type === 'income' ? colors.income : colors.expense },
                  ]}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatCurrency(Math.abs(tx.amount))}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay movimientos recientes</Text>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    contentContainer: {
      paddingBottom: 20,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    dateText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    netWorthCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
      backgroundColor: colors.primary,
      borderRadius: radius.xl,
      ...shadow.md,
    },
    netWorthLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '500',
      marginBottom: spacing.sm,
    },
    netWorthAmount: {
      fontSize: 38,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -1,
      marginBottom: spacing.lg,
    },
    variationRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    variationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radius.full,
    },
    variationText: {
      fontSize: 12,
      fontWeight: '700',
    },
    card: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      padding: spacing.xl,
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      ...shadow.sm,
    },
    cardHeader: {
      marginBottom: spacing.md,
    },
    accountsSection: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    chartArea: {
      height: 80,
      justifyContent: 'flex-end',
      marginTop: spacing.md,
    },
    chartBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 80,
    },
    chartBar: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    accountCard: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      minWidth: 140,
      ...shadow.sm,
    },
    accountDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginBottom: spacing.sm,
    },
    accountName: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: 4,
    },
    accountBalance: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    expenseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    expenseAmount: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    budgetText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    progressLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: '500',
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    txIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    txIconText: {
      fontSize: 16,
      fontWeight: '700',
    },
    txInfo: {
      flex: 1,
    },
    txDescription: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    txDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    txAmount: {
      fontSize: 15,
      fontWeight: '700',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xxxl,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    errorSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
