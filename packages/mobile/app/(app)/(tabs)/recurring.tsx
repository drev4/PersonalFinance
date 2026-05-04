import { useState, useMemo, useCallback } from 'react';
import type React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RepeatIcon, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { useUpcomingRecurring, type UpcomingTransaction } from '@/api/dashboard';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function startOfWeek(d: Date): Date {
  // Week starts on Monday
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const r = new Date(d);
  r.setDate(r.getDate() + diff);
  return r;
}

function eachDayOfMonth(month: Date): Date[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const calStart = startOfWeek(start);
  const days: Date[] = [];
  const cur = new Date(calStart);
  // Fill 6 weeks (42 cells max)
  while (days.length < 42) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    if (days.length >= 28 && cur > end) break;
  }
  return days;
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function formatDayNum(d: Date): string {
  return String(d.getDate());
}

function txDateKey(tx: UpcomingTransaction): string | null {
  if (!tx.recurring?.nextDate) return null;
  const d = new Date(tx.recurring.nextDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Transaction pill ─────────────────────────────────────────────────────────

interface TxPillProps {
  tx: UpcomingTransaction;
  colors: ThemeColors;
}

const TxPill: React.FC<TxPillProps> = ({ tx, colors }) => {
  const color =
    tx.type === 'income' ? colors.income : tx.type === 'expense' ? colors.expense : colors.transfer;
  const bg =
    tx.type === 'income'
      ? colors.incomeLight
      : tx.type === 'expense'
      ? colors.expenseLight
      : colors.transferLight;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
    </View>
  );
};

// ─── Day cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  txs: UpcomingTransaction[];
  colors: ThemeColors;
  onPress: () => void;
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  isCurrentMonth,
  isToday: today,
  isSelected,
  txs,
  colors,
  onPress,
}) => {
  const hasExpense = txs.some((t) => t.type === 'expense');
  const hasIncome = txs.some((t) => t.type === 'income');

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        { borderColor: colors.border },
        isSelected && { backgroundColor: colors.primaryLight },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.dayNumWrap, today && { backgroundColor: colors.primary }]}>
        <Text
          style={[
            styles.dayNum,
            { color: today ? '#fff' : isCurrentMonth ? colors.text : colors.textTertiary },
            isSelected && !today && { color: colors.primary, fontWeight: '700' },
          ]}
        >
          {formatDayNum(day)}
        </Text>
      </View>
      {/* Dot indicators */}
      <View style={styles.dotRow}>
        {hasExpense && <View style={[styles.dot, { backgroundColor: colors.expense }]} />}
        {hasIncome && <View style={[styles.dot, { backgroundColor: colors.income }]} />}
      </View>
    </TouchableOpacity>
  );
};

// ─── Transaction list item ────────────────────────────────────────────────────

interface TxItemProps {
  tx: UpcomingTransaction;
  colors: ThemeColors;
  shadow: ReturnType<typeof getShadow>;
}

const TxItem: React.FC<TxItemProps> = ({ tx, colors, shadow }) => {
  const color =
    tx.type === 'income' ? colors.income : tx.type === 'expense' ? colors.expense : colors.transfer;
  const bg =
    tx.type === 'income'
      ? colors.incomeLight
      : tx.type === 'expense'
      ? colors.expenseLight
      : colors.transferLight;
  const sign = tx.type === 'expense' ? '−' : '+';

  return (
    <View style={[styles.txItem, { backgroundColor: colors.card, ...shadow.sm }]}>
      <View style={[styles.txIcon, { backgroundColor: bg }]}>
        <RepeatIcon size={16} color={color} strokeWidth={2} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={[styles.txFreq, { color: colors.textTertiary }]}>
          {tx.recurring.frequency === 'monthly'
            ? 'Mensual'
            : tx.recurring.frequency === 'weekly'
            ? 'Semanal'
            : tx.recurring.frequency === 'daily'
            ? 'Diaria'
            : 'Anual'}
          {tx.recurring.interval > 1 ? ` · cada ${tx.recurring.interval}` : ''}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>
        {sign}
        {formatCurrency(tx.amount, tx.currency)}
      </Text>
    </View>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

interface EmptyDayProps {
  colors: ThemeColors;
  hasSelection: boolean;
}

const EmptyDay: React.FC<EmptyDayProps> = ({ colors, hasSelection }) => (
  <View style={styles.emptyWrap}>
    <RepeatIcon size={36} color={colors.textTertiary} strokeWidth={1.5} />
    <Text style={[styles.emptyTitle, { color: colors.text }]}>
      {hasSelection ? 'Sin pagos este día' : 'Sin pagos próximos'}
    </Text>
    <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
      {hasSelection
        ? 'No hay transacciones recurrentes programadas para esta fecha'
        : 'Toca un día del calendario para ver sus pagos'}
    </Text>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecurringScreen(): React.ReactElement {
  const { colors, shadow, typography } = useTheme();
  const today = useMemo(() => new Date(), []);

  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Compute days needed to reach end of displayed month
  const days = useMemo(() => {
    const end = endOfMonth(displayMonth);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(31, Math.min(365, diff + 2));
  }, [displayMonth, today]);

  const { data: upcoming, isLoading, refetch } = useUpcomingRecurring(days);

  const txByDate = useMemo(() => {
    const map = new Map<string, UpcomingTransaction[]>();
    for (const tx of upcoming ?? []) {
      const key = txDateKey(tx);
      if (!key) continue;
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, tx]);
    }
    return map;
  }, [upcoming]);

  const calendarDays = useMemo(() => eachDayOfMonth(displayMonth), [displayMonth]);

  const selectedTxs = useMemo(() => {
    if (!selectedDay) return [];
    return txByDate.get(toDateKey(selectedDay)) ?? [];
  }, [selectedDay, txByDate]);

  // All transactions for the displayed month (for summary)
  const monthTxs = useMemo(() => {
    const start = startOfMonth(displayMonth);
    const end = endOfMonth(displayMonth);
    return (upcoming ?? []).filter((tx) => {
      const key = txDateKey(tx);
      if (!key) return false;
      const d = new Date(key);
      return d >= start && d <= end;
    });
  }, [upcoming, displayMonth]);

  const monthExpenses = monthTxs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const monthIncome = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const currency = (upcoming ?? [])[0]?.currency ?? 'EUR';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const styles2 = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.heading, { color: colors.text }]}>Recurrentes</Text>
        </View>

        {/* Month navigator */}
        <View style={[styles2.monthNav, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => {
              setDisplayMonth((m) => addMonths(m, -1));
              setSelectedDay(null);
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.monthCenter}>
            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {formatMonthYear(displayMonth).replace(/^\w/, (c) => c.toUpperCase())}
            </Text>
            {!isLoading && (
              <Text style={[styles.monthSummary, { color: colors.textTertiary }]}>
                <Text style={{ color: colors.expense }}>
                  {formatCurrency(monthExpenses, currency)}
                </Text>
                {' · '}
                <Text style={{ color: colors.income }}>
                  {formatCurrency(monthIncome, currency)}
                </Text>
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => {
              setDisplayMonth((m) => addMonths(m, 1));
              setSelectedDay(null);
            }}
            activeOpacity={0.7}
          >
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={[styles2.calendarCard, { backgroundColor: colors.card }]}>
          {/* Week day headers */}
          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={[styles.weekDay, { color: colors.textTertiary }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          {isLoading ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton
                  key={i}
                  height={44}
                  borderRadius={radius.xs}
                  style={styles.skeletonCell}
                />
              ))}
            </View>
          ) : (
            <View style={styles.grid}>
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const txs = txByDate.get(key) ?? [];
                const inMonth = isSameMonth(day, displayMonth);
                const isT = isSameDay(day, today);
                const isSel = selectedDay ? isSameDay(day, selectedDay) : false;
                return (
                  <DayCell
                    key={key}
                    day={day}
                    isCurrentMonth={inMonth}
                    isToday={isT}
                    isSelected={isSel}
                    txs={txs}
                    colors={colors}
                    onPress={() =>
                      setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
                    }
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Day detail / list */}
        <View style={styles.listSection}>
          {selectedDay ? (
            <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
              {selectedDay
                .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                .replace(/^\w/, (c) => c.toUpperCase())}
            </Text>
          ) : (
            <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
              Este mes — {monthTxs.length} pago{monthTxs.length !== 1 ? 's' : ''}
            </Text>
          )}

          {isLoading ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={64} borderRadius={radius.md} marginBottom={spacing.sm} />
              ))}
            </View>
          ) : (selectedDay ? selectedTxs : monthTxs).length === 0 ? (
            <EmptyDay colors={colors} hasSelection={selectedDay !== null} />
          ) : (
            (selectedDay ? selectedTxs : monthTxs).map((tx) => (
              <TxItem key={tx._id} tx={tx} colors={colors} shadow={shadow} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 120 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  navBtn: {
    padding: spacing.sm,
  },
  monthCenter: {
    alignItems: 'center',
    flex: 1,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthSummary: {
    fontSize: 12,
    marginTop: 2,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  skeletonCell: {
    width: '13%',
    margin: '0.5%',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderRadius: 8,
  },
  dayNumWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 12,
    fontWeight: '500',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pill: {
    width: 6,
    height: 6,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pillDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  listSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  skeletonList: {},
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
  },
  txFreq: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 18,
  },
});

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.xl,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      ...shadow.sm,
    },
    calendarCard: {
      marginHorizontal: spacing.xl,
      borderRadius: radius.lg,
      ...shadow.sm,
      overflow: 'hidden',
    },
  });
}
