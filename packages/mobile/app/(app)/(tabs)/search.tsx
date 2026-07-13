import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  BarChart2,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Search,
  Target,
  X,
} from 'lucide-react-native';
import { useAccounts } from '@/api/accounts';
import client from '@/api/client';
import type { HoldingWithValue } from '@/api/holdings';
import { useHoldings } from '@/api/holdings';
import { formatCurrency } from '@/lib/formatters';
import { colors, radius, spacing, typography } from '@/theme';
import { useTheme } from '@/theme/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultGroup = 'nav' | 'transaction' | 'account' | 'holding';

interface ResultItem {
  id: string;
  group: ResultGroup;
  label: string;
  sublabel?: string;
  meta?: string;
  metaColor?: string;
  route: string;
}

interface SearchTransaction {
  _id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  date: string;
  description: string;
}

interface SearchResponse {
  data: { data: SearchTransaction[]; meta: { total: number } };
}

// ─── Quick nav (empty state) ──────────────────────────────────────────────────

interface QuickNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  route: string;
}

const QUICK_NAV: QuickNavItem[] = [
  { id: 'nav-index', label: 'Inicio', icon: LayoutDashboard, route: '/(app)/(tabs)/' },
  {
    id: 'nav-transactions',
    label: 'Transacciones',
    icon: ArrowLeftRight,
    route: '/(app)/(tabs)/transactions',
  },
  { id: 'nav-accounts', label: 'Cuentas', icon: CreditCard, route: '/(app)/(tabs)/accounts' },
  { id: 'nav-budgets', label: 'Presupuestos', icon: PiggyBank, route: '/(app)/(tabs)/budgets' },
  { id: 'nav-goals', label: 'Metas', icon: Target, route: '/(app)/(tabs)/goals' },
  { id: 'nav-portfolio', label: 'Inversiones', icon: BarChart2, route: '/(app)/(tabs)/portfolio' },
];

const GROUP_LABELS: Record<ResultGroup, string> = {
  nav: 'Navegación rápida',
  transaction: 'Transacciones',
  account: 'Cuentas',
  holding: 'Inversiones',
};

const TYPE_COLOR: Record<string, string> = {
  income: colors.income,
  expense: colors.expense,
  transfer: colors.transfer,
};

// ─── Result row ───────────────────────────────────────────────────────────────

interface ResultRowProps {
  label: string;
  sublabel?: string;
  meta?: string;
  metaColor?: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  onPress: () => void;
}

function ResultRow({
  label,
  sublabel,
  meta,
  metaColor,
  Icon,
  onPress,
}: ResultRowProps): React.ReactElement {
  const { colors: c } = useTheme();
  return (
    <TouchableOpacity
      style={[rowStyles.row, { backgroundColor: c.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: c.primaryLight }]}>
        <Icon size={16} color={c.primary} strokeWidth={1.8} />
      </View>
      <View style={rowStyles.textWrap}>
        <Text style={[rowStyles.label, { color: c.text }]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[rowStyles.sublabel, { color: c.textTertiary }]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text style={[rowStyles.meta, { color: metaColor ?? c.textSecondary }]}>{meta}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 12,
    marginTop: 1,
  },
  meta: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen(): React.ReactElement {
  const router = useRouter();
  const { colors: c } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(rawQuery.trim()), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rawQuery]);

  const hasQuery = debouncedQuery.length >= 2;

  // Transaction search via API
  const { data: txData, isFetching: txLoading } = useQuery({
    queryKey: ['search-transactions', debouncedQuery],
    queryFn: async () => {
      const res = await client.get<SearchResponse['data']>(
        `/transactions?search=${encodeURIComponent(debouncedQuery)}&limit=5`,
      );
      return res.data.data;
    },
    enabled: hasQuery,
    staleTime: 1000 * 30,
  });

  // Accounts + holdings (client-side filter)
  const { data: accounts } = useAccounts();
  const { data: holdingsData } = useHoldings();

  const txResults: ResultItem[] = (txData ?? []).map((tx) => ({
    id: tx._id,
    group: 'transaction',
    label: tx.description,
    sublabel: new Date(tx.date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    meta: `${tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}${formatCurrency(
      tx.amount,
      tx.currency,
    )}`,
    metaColor: TYPE_COLOR[tx.type],
    route: '/(app)/(tabs)/transactions',
  }));

  const q = debouncedQuery.toLowerCase();

  const accResults: ResultItem[] = hasQuery
    ? (accounts ?? [])
        .filter(
          (a) =>
            a.name.toLowerCase().includes(q) || (a.institution ?? '').toLowerCase().includes(q),
        )
        .slice(0, 4)
        .map((a) => ({
          id: a._id,
          group: 'account',
          label: a.name,
          sublabel: a.institution ?? a.type,
          meta: formatCurrency(a.currentBalance, a.currency),
          route: '/(app)/(tabs)/accounts',
        }))
    : [];

  const holdingResults: ResultItem[] = hasQuery
    ? ((holdingsData as HoldingWithValue[] | undefined) ?? [])
        .filter((h) => h.symbol.toLowerCase().includes(q) || h.assetType.toLowerCase().includes(q))
        .slice(0, 4)
        .map((h) => ({
          id: h._id,
          group: 'holding',
          label: h.symbol,
          sublabel: h.assetType.toUpperCase(),
          meta: `${h.pnl >= 0 ? '+' : ''}${h.pnlPercentage.toFixed(2)}%`,
          metaColor: h.pnl >= 0 ? colors.income : colors.expense,
          route: '/(app)/(tabs)/portfolio',
        }))
    : [];

  const allResults = [...txResults, ...accResults, ...holdingResults];

  const navigate = useCallback(
    (route: string) => {
      router.push(route as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  // Group display
  const groups: ResultGroup[] = [];
  const seenGroups = new Set<ResultGroup>();
  for (const item of allResults) {
    if (!seenGroups.has(item.group)) {
      seenGroups.add(item.group);
      groups.push(item.group);
    }
  }

  const isLoading = hasQuery && txLoading;
  const isEmpty = hasQuery && !txLoading && allResults.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.border }]}>
          <Search size={16} color={c.textTertiary} strokeWidth={1.8} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: c.text }]}
            placeholder="Buscar transacciones, cuentas..."
            placeholderTextColor={c.textTertiary}
            value={rawQuery}
            onChangeText={setRawQuery}
            autoFocus={false}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {rawQuery.length > 0 && (
            <TouchableOpacity onPress={() => setRawQuery('')} hitSlop={8}>
              <X size={16} color={c.textTertiary} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Loading */}
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={c.primary} />
          </View>
        )}

        {/* Empty state — show quick nav */}
        {!hasQuery && (
          <View style={styles.section}>
            <Text style={[styles.groupLabel, { color: c.textTertiary }]}>
              {GROUP_LABELS.nav.toUpperCase()}
            </Text>
            {QUICK_NAV.map((item) => (
              <ResultRow
                key={item.id}
                label={item.label}
                Icon={item.icon}
                onPress={() => navigate(item.route)}
              />
            ))}
          </View>
        )}

        {/* No results */}
        {isEmpty && (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { color: c.textTertiary }]}>
              Sin resultados para &quot;{debouncedQuery}&quot;
            </Text>
          </View>
        )}

        {/* Results grouped */}
        {!isLoading &&
          groups.map((group) => {
            const groupItems = allResults.filter((r) => r.group === group);
            return (
              <View key={group} style={styles.section}>
                <Text style={[styles.groupLabel, { color: c.textTertiary }]}>
                  {GROUP_LABELS[group].toUpperCase()}
                </Text>
                {groupItems.map((item) => (
                  <ResultRow
                    key={item.id}
                    label={item.label}
                    sublabel={item.sublabel}
                    meta={item.meta}
                    metaColor={item.metaColor}
                    Icon={
                      item.group === 'transaction'
                        ? ArrowLeftRight
                        : item.group === 'account'
                        ? CreditCard
                        : BarChart2
                    }
                    onPress={() => navigate(item.route)}
                  />
                ))}
              </View>
            );
          })}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPad: {
    height: spacing.xxl,
  },
});
