import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  PanResponder,
  Modal,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useMemo, useRef, useCallback, memo } from 'react';
import type React from 'react';
import {
  Plus, Pencil, Archive, Landmark, Wallet, CreditCard, Building2,
  Car, Bitcoin, TrendingUp, Banknote, Coins, Layers, X,
} from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import {
  useAccounts, useAdjustBalance, useArchiveAccount, type Account, type AccountType,
} from '@/api/accounts';
import { AccountFormModal, ACCOUNT_TYPE_LABELS } from '@/components/AccountFormModal';
import * as Haptics from 'expo-haptics';

// ── Account type config ───────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;

const TYPE_ICON: Record<AccountType, IconComponent> = {
  checking: Landmark,
  savings: Coins,
  cash: Wallet,
  credit_card: CreditCard,
  real_estate: Building2,
  vehicle: Car,
  loan: Banknote,
  mortgage: Banknote,
  crypto: Bitcoin,
  investment: TrendingUp,
  other: Layers,
};

const SWIPE_WIDTH = 80;

// ── Adjust balance sheet ──────────────────────────────────────────────────────

interface AdjustSheetProps {
  account: Account | null;
  colors: ThemeColors;
  shadow: ReturnType<typeof getShadow>;
  onClose: () => void;
}

function AdjustSheet({ account, colors, shadow, onClose }: AdjustSheetProps) {
  const styles = useMemo(() => createSheetStyles(colors, shadow), [colors, shadow]);
  const [newBalance, setNewBalance] = useState('');
  const { mutate: adjustBalance, isPending } = useAdjustBalance();

  const handleAdjust = () => {
    if (!account || newBalance === '') return;
    const cents = Math.round(parseFloat(newBalance.replace(',', '.')) * 100);
    if (isNaN(cents)) return;
    adjustBalance(
      { id: account._id, newBalance: cents },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          setNewBalance('');
          onClose();
        },
        onError: () => Alert.alert('Error', 'No se pudo ajustar el saldo'),
      },
    );
  };

  return (
    <Modal visible={!!account} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaProvider>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => { Keyboard.dismiss(); onClose(); }}
        />
        <SafeAreaView style={styles.sheetWrap} edges={['bottom']} pointerEvents="box-none">
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Ajustar saldo</Text>
                <Text style={styles.sheetSub} numberOfLines={1}>{account?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => { Keyboard.dismiss(); onClose(); }}
                style={styles.sheetClose}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.currentLabel}>
              Saldo actual:{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {account ? formatCurrency(account.currentBalance) : '—'}
              </Text>
            </Text>

            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: colors.primary }]}>
                {account?.currency ?? '€'}
              </Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Nuevo saldo"
                placeholderTextColor={colors.textTertiary}
                value={newBalance}
                onChangeText={setNewBalance}
                keyboardType="decimal-pad"
                autoFocus
                selectionColor={colors.primary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: newBalance ? colors.primary : colors.textTertiary },
              ]}
              onPress={handleAdjust}
              disabled={!newBalance || isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmBtnText}>Confirmar ajuste</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

// ── Swipeable account row ─────────────────────────────────────────────────────

interface SwipeableAccountRowProps {
  account: Account;
  colors: ThemeColors;
  rowBg: string;
  onEdit: (a: Account) => void;
  onAdjust: (a: Account) => void;
  onArchive: (id: string) => void;
}

const SwipeableAccountRow: React.FC<SwipeableAccountRowProps> = memo(({
  account, colors, rowBg, onEdit, onAdjust, onArchive,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const offset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => offset.current !== 0,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (Math.abs(gs.dy) > Math.abs(gs.dx)) return false;
        return gs.dx < -8;
      },
      onPanResponderMove: (_, gs) => {
        const next = Math.max(-SWIPE_WIDTH, Math.min(0, offset.current + gs.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gs) => {
        const landed = offset.current + gs.dx;
        if (landed < -(SWIPE_WIDTH / 2)) {
          Animated.spring(translateX, { toValue: -SWIPE_WIDTH, useNativeDriver: true }).start();
          offset.current = -SWIPE_WIDTH;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          offset.current = 0;
        }
      },
    }),
  ).current;

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    offset.current = 0;
  }, [translateX]);

  const accentColor = account.color ?? colors.primary;
  const Icon = TYPE_ICON[account.type] ?? Landmark;
  const isNegative = account.currentBalance < 0;
  const balanceColor = isNegative ? colors.expense : colors.income;

  return (
    <View style={{ backgroundColor: colors.expense, marginBottom: 1 }}>
      {/* Archive button behind row */}
      <View style={swipeStyles.archiveAction}>
        <TouchableOpacity
          onPress={() => { close(); onArchive(account._id); }}
          style={swipeStyles.archiveBtn}
          activeOpacity={0.8}
        >
          <Archive size={20} color="#fff" />
          <Text style={swipeStyles.archiveBtnText}>Archivar</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={{ transform: [{ translateX }], backgroundColor: rowBg }}
        {...panResponder.panHandlers}
      >
        <View style={[rowStyles.row, { backgroundColor: rowBg }]}>
          {/* Icon */}
          <View style={[rowStyles.iconWrap, { backgroundColor: accentColor + '20' }]}>
            <Icon size={20} color={accentColor} strokeWidth={1.8} />
          </View>

          {/* Info */}
          <View style={rowStyles.info}>
            <Text style={rowStyles.name} numberOfLines={1}>{account.name}</Text>
            <Text style={rowStyles.sub} numberOfLines={1}>
              {ACCOUNT_TYPE_LABELS[account.type]}
              {account.institution ? ` · ${account.institution}` : ''}
            </Text>
          </View>

          {/* Balance */}
          <View style={rowStyles.right}>
            <Text style={[rowStyles.balance, { color: balanceColor }]}>
              {formatCurrency(account.currentBalance)}
            </Text>
            <Text style={rowStyles.currency}>{account.currency}</Text>
          </View>

          {/* Edit / Adjust actions */}
          <View style={rowStyles.actions}>
            <TouchableOpacity
              style={rowStyles.actionBtn}
              onPress={() => onAdjust(account)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Banknote size={15} color={colors.income} />
            </TouchableOpacity>
            <TouchableOpacity
              style={rowStyles.actionBtn}
              onPress={() => onEdit(account)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Pencil size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

SwipeableAccountRow.displayName = 'SwipeableAccountRow';

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [adjustAccount, setAdjustAccount] = useState<Account | null>(null);

  const { data: accounts = [], isLoading, refetch } = useAccounts();
  const { mutate: archiveAccount } = useArchiveAccount();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormVisible(true);
  };

  const handleArchive = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Archivar cuenta',
      'La cuenta se ocultará de tus listas. Las transacciones existentes se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            archiveAccount(id, {
              onError: () => Alert.alert('Error', 'No se pudo archivar la cuenta'),
            });
          },
        },
      ],
    );
  };

  // Summary figures
  const included = accounts.filter((a) => a.includedInNetWorth);
  const assets = included.filter((a) => a.currentBalance >= 0).reduce((s, a) => s + a.currentBalance, 0);
  const liabilities = included.filter((a) => a.currentBalance < 0).reduce((s, a) => s + Math.abs(a.currentBalance), 0);
  const netWorth = assets - liabilities;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cuentas</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditingAccount(undefined); setFormVisible(true); }}
          activeOpacity={0.8}
        >
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Net worth summary */}
        {(isLoading && accounts.length === 0) ? (
          <View style={styles.summarySkeletonWrap}>
            <Skeleton height={100} borderRadius={24} marginBottom={0} />
          </View>
        ) : accounts.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Patrimonio neto</Text>
            <Text style={styles.summaryNetWorth}>{formatCurrency(netWorth)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Activos</Text>
                <Text style={[styles.summaryItemValue, { color: colors.income }]}>
                  {formatCurrency(assets)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Pasivos</Text>
                <Text style={[styles.summaryItemValue, { color: colors.expense }]}>
                  {formatCurrency(liabilities)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Accounts list */}
        {isLoading && accounts.length === 0 ? (
          <View style={styles.listWrap}>
            <Skeleton height={72} borderRadius={0} marginBottom={1} />
            <Skeleton height={72} borderRadius={0} marginBottom={1} />
            <Skeleton height={72} borderRadius={0} marginBottom={0} />
          </View>
        ) : accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Landmark size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin cuentas</Text>
            <Text style={styles.emptySubtitle}>
              Añade tus cuentas bancarias, tarjetas y otros activos para llevar un control completo
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setFormVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={16} color={colors.white} />
              <Text style={styles.emptyBtnText}>Añadir cuenta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listWrap}>
            <Text style={styles.swipeHint}>← Desliza para archivar</Text>
            {accounts.map((account) => (
              <SwipeableAccountRow
                key={account._id}
                account={account}
                colors={colors}
                rowBg={colors.card}
                onEdit={handleEdit}
                onAdjust={setAdjustAccount}
                onArchive={handleArchive}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AccountFormModal
        visible={formVisible}
        account={editingAccount}
        onClose={() => { setFormVisible(false); setEditingAccount(undefined); }}
      />
      <AdjustSheet
        account={adjustAccount}
        colors={colors}
        shadow={shadow}
        onClose={() => setAdjustAccount(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const swipeStyles = StyleSheet.create({
  archiveAction: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: SWIPE_WIDTH, justifyContent: 'center', alignItems: 'center',
  },
  archiveBtn: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 4, width: SWIPE_WIDTH,
  },
  archiveBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.md,
    minHeight: 72,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  right: { alignItems: 'flex-end' },
  balance: { fontSize: 16, fontWeight: '700' },
  currency: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 1 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
});

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
    },
    title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
    addBtn: {
      width: 40, height: 40, borderRadius: radius.full,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
      ...shadow.sm,
    },
    summarySkeletonWrap: { marginHorizontal: spacing.xl, marginBottom: spacing.lg },
    summaryCard: {
      marginHorizontal: spacing.xl, marginBottom: spacing.lg,
      backgroundColor: colors.primary, borderRadius: radius.xl,
      padding: spacing.xl, ...shadow.md,
    },
    summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
    summaryNetWorth: {
      fontSize: 32, fontWeight: '800', color: '#fff',
      letterSpacing: -0.5, marginBottom: spacing.lg,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1 },
    summaryItemLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
    summaryItemValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
    summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: spacing.lg },
    listWrap: {
      marginHorizontal: spacing.xl, backgroundColor: colors.card,
      borderRadius: radius.xl, overflow: 'hidden', ...shadow.sm,
    },
    swipeHint: {
      fontSize: 11, color: colors.textTertiary, fontWeight: '500',
      textAlign: 'right', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs,
    },
    emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xxxl },
    emptyIcon: {
      width: 72, height: 72, borderRadius: radius.xl,
      backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
      marginBottom: spacing.xl, ...shadow.sm,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    emptySubtitle: {
      fontSize: 14, color: colors.textSecondary, textAlign: 'center',
      lineHeight: 20, marginBottom: spacing.xxl,
    },
    emptyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md, borderRadius: radius.full, ...shadow.sm,
    },
    emptyBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  });
}

function createSheetStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    sheet: {
      backgroundColor: colors.bg, borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl, padding: spacing.xl,
      paddingTop: spacing.md, ...shadow.md,
    },
    handle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
    },
    sheetHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: spacing.md,
    },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    sheetClose: {
      width: 32, height: 32, borderRadius: radius.full,
      backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
    },
    currentLabel: {
      fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg,
    },
    amountRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, marginBottom: spacing.lg,
      ...shadow.sm,
    },
    currencySymbol: { fontSize: 20, fontWeight: '800', marginRight: spacing.xs },
    amountInput: {
      flex: 1, paddingVertical: 15, fontSize: 24,
      fontWeight: '700', color: colors.text, letterSpacing: -0.5,
    },
    confirmBtn: {
      paddingVertical: 17, borderRadius: radius.full,
      alignItems: 'center', ...shadow.md,
    },
    confirmBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  });
}
