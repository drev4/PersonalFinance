import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { useCashflow, useSpendingByCategory } from '@/api/dashboard';

type Period = 'month' | '3m' | '6m' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Este mes',
  '3m': '3 meses',
  '6m': '6 meses',
  year: 'Este año',
};

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function getPeriodDates(period: Period): { from: Date; to: Date; months: number } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  switch (period) {
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to, months: 1 };
    case '3m':
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to, months: 3 };
    case '6m':
      return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to, months: 6 };
    case 'year':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to,
        months: now.getMonth() + 1,
      };
  }
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const { from, to, months } = useMemo(() => getPeriodDates(period), [period]);

  const {
    data: cashflow,
    isLoading: cashflowLoading,
    refetch: refetchCashflow,
  } = useCashflow(months);

  const {
    data: spending,
    isLoading: spendingLoading,
    refetch: refetchSpending,
  } = useSpendingByCategory(from, to);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCashflow(), refetchSpending()]);
    setRefreshing(false);
  };

  const totals = useMemo(() => {
    if (!cashflow?.length) return { income: 0, expenses: 0, net: 0 };
    return cashflow.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expenses: acc.expenses + m.expenses,
        net: acc.net + m.net,
      }),
      { income: 0, expenses: 0, net: 0 },
    );
  }, [cashflow]);

  const maxCashflow = useMemo(() => {
    if (!cashflow?.length) return 1;
    return Math.max(...cashflow.flatMap((m) => [m.income, m.expenses]), 1);
  }, [cashflow]);

  const isLoading = cashflowLoading && spendingLoading && !cashflow && !spending;

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
        <View style={styles.header}>
          <Text style={styles.title}>Informes</Text>
        </View>

        {/* Period selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodRow}
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && { backgroundColor: colors.primary }]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodChipText, period === p && { color: '#fff' }]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          {cashflowLoading && !cashflow ? (
            <>
              <Skeleton width="30%" height={60} borderRadius={radius.lg} marginBottom={0} />
              <Skeleton width="30%" height={60} borderRadius={radius.lg} marginBottom={0} />
              <Skeleton width="30%" height={60} borderRadius={radius.lg} marginBottom={0} />
            </>
          ) : (
            <>
              <View style={[styles.summaryCard, { backgroundColor: colors.incomeLight }]}>
                <Text style={styles.summaryLabel}>Ingresos</Text>
                <Text style={[styles.summaryAmount, { color: colors.income }]}>
                  {formatCurrency(totals.income)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.expenseLight }]}>
                <Text style={styles.summaryLabel}>Gastos</Text>
                <Text style={[styles.summaryAmount, { color: colors.expense }]}>
                  {formatCurrency(totals.expenses)}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: totals.net >= 0 ? colors.incomeLight : colors.expenseLight,
                  },
                ]}
              >
                <Text style={styles.summaryLabel}>Balance</Text>
                <View style={styles.summaryBalanceRow}>
                  {totals.net >= 0 ? (
                    <TrendingUp size={12} color={colors.income} />
                  ) : (
                    <TrendingDown size={12} color={colors.expense} />
                  )}
                  <Text
                    style={[
                      styles.summaryAmount,
                      { color: totals.net >= 0 ? colors.income : colors.expense },
                    ]}
                  >
                    {formatCurrency(Math.abs(totals.net))}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Cashflow chart — only shown when period > 1 month */}
        {months > 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Flujo de caja</Text>
            {cashflowLoading && !cashflow ? (
              <Skeleton height={120} borderRadius={3} marginBottom={0} />
            ) : !cashflow || cashflow.length === 0 ? (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyText}>Sin datos para este período</Text>
              </View>
            ) : (
              <>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
                    <Text style={styles.legendLabel}>Ingresos</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
                    <Text style={styles.legendLabel}>Gastos</Text>
                  </View>
                </View>
                <View style={styles.chartArea}>
                  {cashflow.map((m) => {
                    const incomeH = Math.max(3, Math.round((m.income / maxCashflow) * 110));
                    const expenseH = Math.max(3, Math.round((m.expenses / maxCashflow) * 110));
                    const monthIdx = parseInt(m.month.split('-')[1], 10) - 1;
                    return (
                      <View key={m.month} style={styles.chartMonthGroup}>
                        <View style={styles.chartPairBars}>
                          <View
                            style={[
                              styles.chartBar,
                              { height: incomeH, backgroundColor: colors.income },
                            ]}
                          />
                          <View
                            style={[
                              styles.chartBar,
                              { height: expenseH, backgroundColor: colors.expense },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartLabel}>{MONTHS_ES[monthIdx]}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* Spending by category */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Gastos por categoría</Text>
          {spendingLoading && !spending ? (
            <>
              <Skeleton height={18} marginBottom={10} />
              <Skeleton height={18} marginBottom={10} />
              <Skeleton height={18} marginBottom={0} />
            </>
          ) : !spending || spending.length === 0 ? (
            <Text style={styles.emptyText}>Sin gastos en este período</Text>
          ) : (
            [...spending]
              .sort((a, b) => b.total - a.total)
              .map((cat, idx) => (
                <View
                  key={cat.categoryId}
                  style={[styles.categoryRow, idx === 0 && { marginTop: spacing.sm }]}
                >
                  <View style={styles.categoryHeader}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: cat.color || colors.primary }]}
                    />
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={[styles.categoryAmount, { color: colors.expense }]}>
                      {formatCurrency(cat.total)}
                    </Text>
                  </View>
                  <View style={styles.categoryTrack}>
                    <View
                      style={[
                        styles.categoryFill,
                        {
                          width: `${Math.min(cat.percentage, 100)}%`,
                          backgroundColor: cat.color || colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryPct}>{cat.percentage.toFixed(1)}%</Text>
                </View>
              ))
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
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: colors.text,
    },
    periodRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
    },
    periodChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      ...shadow.sm,
    },
    periodChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    summaryCard: {
      flex: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    summaryAmount: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    summaryBalanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    card: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      padding: spacing.xl,
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      ...shadow.sm,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.md,
    },
    chartLegend: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginBottom: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    chartArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      height: 130,
    },
    chartMonthGroup: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
    },
    chartPairBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      flex: 1,
    },
    chartBar: {
      flex: 1,
      borderRadius: 3,
      minHeight: 3,
    },
    chartLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'capitalize',
    },
    emptyChart: {
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    categoryRow: {
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: spacing.sm,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      flexShrink: 0,
    },
    categoryName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: '700',
    },
    categoryTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginBottom: 4,
    },
    categoryFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    categoryPct: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: '500',
      textAlign: 'right',
    },
  });
}
