import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboardSummary, useCashflow, useHealthScore } from '@/api/dashboard';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

type NetWorthView = 'neto' | 'activos' | 'pasivos';
const NW_VIEWS: { key: NetWorthView; label: string }[] = [
  { key: 'neto', label: 'Neto' },
  { key: 'activos', label: 'Activos' },
  { key: 'pasivos', label: 'Pasivos' },
];

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

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, error, refetch } = useDashboardSummary();
  const { data: cashflow, isLoading: cashflowLoading, refetch: refetchCashflow } = useCashflow(6);
  const { data: healthScore, refetch: refetchHealth } = useHealthScore();
  const [refreshing, setRefreshing] = useState(false);
  const [nwView, setNwView] = useState<NetWorthView>('activos');

  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchCashflow(), refetchHealth()]);
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
          {/* Toggle: Neto / Activos / Pasivos */}
          <View style={styles.nwToggleRow}>
            {NW_VIEWS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setNwView(key)}
                style={[styles.nwTogglePill, nwView === key && styles.nwTogglePillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.nwToggleText, nwView === key && styles.nwToggleTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.netWorthAmount}>
            {formatCurrency(
              nwView === 'neto'
                ? data?.netWorth || 0
                : nwView === 'activos'
                ? data?.netWorthAssets || 0
                : data?.netWorthLiabilities || 0,
            )}
          </Text>

          {nwView === 'neto' && (
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
          )}
        </View>

        {/* Cashflow chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Últimos 6 meses</Text>
          </View>
          <View style={styles.chartArea}>
            {cashflowLoading || !cashflow ? (
              <Skeleton height={76} borderRadius={3} marginBottom={0} />
            ) : cashflow.length === 0 ? (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>Sin datos</Text>
              </View>
            ) : (
              (() => {
                const maxExp = Math.max(...cashflow.map((m) => m.expenses), 1);
                return (
                  <>
                    <View style={styles.chartBars}>
                      {cashflow.map((m, i) => {
                        const barH = Math.max(4, Math.round((m.expenses / maxExp) * 76));
                        const isLast = i === cashflow.length - 1;
                        const barColor = m.net < 0 ? colors.expense : colors.primary;
                        return (
                          <View
                            key={m.month}
                            style={[
                              styles.chartBar,
                              {
                                height: barH,
                                backgroundColor: barColor,
                                opacity: isLast
                                  ? 1
                                  : 0.35 + (i / Math.max(cashflow.length - 1, 1)) * 0.5,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.chartLabels}>
                      {cashflow.map((m) => {
                        const monthIdx = parseInt(m.month.split('-')[1], 10) - 1;
                        return (
                          <Text key={m.month} style={styles.chartLabel}>
                            {MONTHS_ES[monthIdx]}
                          </Text>
                        );
                      })}
                    </View>
                  </>
                );
              })()
            )}
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

        {/* Health Score */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Salud financiera</Text>
          {!healthScore ? (
            <Skeleton height={14} width="60%" marginBottom={12} />
          ) : (
            <>
              <View style={styles.healthHeader}>
                <View style={styles.healthScoreCircle}>
                  <Text style={[styles.healthScoreNumber, { color: healthScore.color }]}>
                    {healthScore.score}
                  </Text>
                  <Text style={styles.healthScoreMax}>/100</Text>
                </View>
                <View style={styles.healthLabelWrap}>
                  <Text style={[styles.healthLabel, { color: healthScore.color }]}>
                    {healthScore.label}
                  </Text>
                  <Text style={styles.healthSub}>Índice de salud financiera</Text>
                </View>
              </View>
              {healthScore.areas.map((area) => {
                const pct = Math.round((area.score / area.max) * 100);
                const barColor =
                  pct >= 80
                    ? '#22c55e'
                    : pct >= 60
                    ? '#84cc16'
                    : pct >= 40
                    ? '#f59e0b'
                    : pct >= 20
                    ? '#f97316'
                    : '#ef4444';
                return (
                  <View key={area.key} style={styles.areaRow}>
                    <View style={styles.areaLabelRow}>
                      <Text style={styles.areaLabel}>{area.label}</Text>
                      <Text style={styles.areaScore}>
                        {area.score}/{area.max}
                      </Text>
                    </View>
                    <View style={styles.areaTrack}>
                      <View
                        style={[styles.areaFill, { width: `${pct}%`, backgroundColor: barColor }]}
                      />
                    </View>
                    <Text style={styles.areaDetail}>{area.detail}</Text>
                  </View>
                );
              })}
            </>
          )}
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
    nwToggleRow: {
      flexDirection: 'row',
      gap: 2,
      marginBottom: spacing.md,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderRadius: radius.full,
      padding: 2,
    },
    nwTogglePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    nwTogglePillActive: {
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    nwToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.5)',
    },
    nwToggleTextActive: {
      color: '#FFFFFF',
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
      marginTop: spacing.md,
    },
    chartBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 76,
    },
    chartBar: {
      flex: 1,
      borderRadius: 3,
    },
    chartLabels: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 6,
    },
    chartLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 9,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'capitalize',
    },
    chartEmpty: {
      height: 76,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chartEmptyText: {
      fontSize: 13,
      color: colors.textTertiary,
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
    healthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      marginBottom: spacing.lg,
    },
    healthScoreCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    healthScoreNumber: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    healthScoreMax: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: '600',
    },
    healthLabelWrap: {
      flex: 1,
    },
    healthLabel: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    healthSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    areaRow: {
      marginBottom: spacing.md,
    },
    areaLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    areaLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    areaScore: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    areaTrack: {
      height: 5,
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginBottom: 3,
    },
    areaFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    areaDetail: {
      fontSize: 11,
      color: colors.textTertiary,
    },
  });
}
