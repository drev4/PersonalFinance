import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Pencil,
  Archive,
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  CreditCard,
  Building2,
  Car,
  Bitcoin,
  Banknote,
  Coins,
  Layers,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
} from 'lucide-react-native';
import type React from 'react';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useAccount, useAdjustBalance, useArchiveAccount, type AccountType } from '@/api/accounts';
import { useTransactions, useCategories } from '@/api/transactions';
import { AccountFormModal, ACCOUNT_TYPE_LABELS } from '@/components/AccountFormModal';
import * as Haptics from 'expo-haptics';

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

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const [adjustVisible, setAdjustVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newBalance, setNewBalance] = useState('');

  const accountId = Array.isArray(id) ? id[0] : id ?? null;

  const { data: account, isLoading, refetch } = useAccount(accountId);
  const { data: txResult } = useTransactions({ accountId: accountId ?? undefined, limit: 15 });
  const transactions = txResult?.data ?? [];
  const { data: categories = [] } = useCategories();

  const { mutate: adjustBalance, isPending: adjustPending } = useAdjustBalance();
  const { mutate: archiveAccount } = useArchiveAccount();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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
          setAdjustVisible(false);
          refetch();
        },
        onError: () => Alert.alert('Error', 'No se pudo ajustar el saldo'),
      },
    );
  };

  const handleArchive = () => {
    if (!account) return;
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
            archiveAccount(account._id, {
              onSuccess: () => router.back(),
              onError: () => Alert.alert('Error', 'No se pudo archivar la cuenta'),
            });
          },
        },
      ],
    );
  };

  if (isLoading || !account) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
          <Skeleton height={220} borderRadius={radius.xl} marginBottom={spacing.lg} />
          <Skeleton height={96} borderRadius={radius.xl} marginBottom={spacing.md} />
          <Skeleton height={80} borderRadius={radius.xl} marginBottom={spacing.md} />
          <Skeleton height={200} borderRadius={radius.xl} />
        </View>
      </SafeAreaView>
    );
  }

  const accentColor = account.color ?? colors.primary;
  const Icon = TYPE_ICON[account.type] ?? Landmark;
  const change = account.currentBalance - account.initialBalance;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* ── Hero card ─────────────────────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: accentColor }]}>
          <TouchableOpacity style={styles.heroBack} onPress={() => router.back()}>
            <ChevronLeft size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroEdit} onPress={() => setEditVisible(true)}>
            <Pencil size={16} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          <View style={styles.heroIconWrap}>
            <Icon size={26} color="#fff" strokeWidth={1.8} />
          </View>

          <Text style={styles.heroName}>{account.name}</Text>
          <Text style={styles.heroSub}>
            {ACCOUNT_TYPE_LABELS[account.type]}
            {account.institution ? ` · ${account.institution}` : ''}
          </Text>

          <Text style={styles.heroBalance}>
            {formatCurrency(account.currentBalance, account.currency)}
          </Text>

          <View style={styles.heroChangeRow}>
            {change >= 0 ? (
              <TrendingUp size={13} color="rgba(255,255,255,0.75)" />
            ) : (
              <TrendingDown size={13} color="rgba(255,255,255,0.75)" />
            )}
            <Text style={styles.heroChange}>
              {change >= 0 ? '+' : ''}
              {formatCurrency(change, account.currency)} desde inicio
            </Text>
          </View>
        </View>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, shadow.sm]}>
            <Text style={styles.statLabel}>Saldo inicial</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {formatCurrency(account.initialBalance, account.currency)}
            </Text>
          </View>
          <View style={[styles.statCard, shadow.sm]}>
            <Text style={styles.statLabel}>Fecha apertura</Text>
            <Text style={styles.statValue}>{formatDate(account.createdAt, 'short')}</Text>
          </View>
        </View>

        {/* ── Badges ────────────────────────────────────────────────────────── */}
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: account.includedInNetWorth ? colors.incomeLight : colors.inputBg,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: account.includedInNetWorth ? colors.income : colors.textSecondary,
                },
              ]}
            >
              {account.includedInNetWorth ? '✓ Incluido en PN' : 'Excluido de PN'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {account.currency}
            </Text>
          </View>
        </View>

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        {account.notes ? (
          <View style={[styles.notesCard, shadow.sm]}>
            <Text style={styles.notesLabel}>Notas</Text>
            <Text style={styles.notesText}>{account.notes}</Text>
          </View>
        ) : null}

        {/* ── Recent transactions ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movimientos recientes</Text>
          {transactions.length > 0 ? (
            <View style={[styles.txCard, shadow.sm]}>
              {transactions.map((tx, index) => {
                const cat = categories.find((c) => c._id === tx.categoryId);
                const isLast = index === transactions.length - 1;
                const dotBg =
                  tx.type === 'income'
                    ? colors.incomeLight
                    : tx.type === 'expense'
                    ? colors.expenseLight
                    : colors.transferLight;
                const amountColor =
                  tx.type === 'income'
                    ? colors.income
                    : tx.type === 'expense'
                    ? colors.expense
                    : colors.transfer;
                const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

                return (
                  <View key={tx._id || tx.id} style={[styles.txRow, !isLast && styles.txRowBorder]}>
                    <View style={[styles.txDot, { backgroundColor: dotBg }]}>
                      {tx.type === 'income' ? (
                        <ArrowDownLeft size={13} color={colors.income} />
                      ) : tx.type === 'expense' ? (
                        <ArrowUpRight size={13} color={colors.expense} />
                      ) : (
                        <ArrowLeftRight size={13} color={colors.transfer} />
                      )}
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text style={styles.txMeta} numberOfLines={1}>
                        {formatDate(tx.date, 'short')}
                        {cat ? ` · ${cat.name}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: amountColor }]}>
                      {prefix}
                      {formatCurrency(tx.amount, tx.currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.txEmpty, shadow.sm]}>
              <Text style={styles.txEmptyText}>Sin movimientos registrados</Text>
            </View>
          )}
        </View>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionPrimary, { backgroundColor: accentColor }, shadow.sm]}
            onPress={() => setAdjustVisible(true)}
            activeOpacity={0.85}
          >
            <Banknote size={18} color="#fff" />
            <Text style={styles.actionPrimaryText}>Ajustar saldo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionOutline, { borderColor: accentColor }, shadow.sm]}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.85}
          >
            <Pencil size={16} color={accentColor} />
            <Text style={[styles.actionOutlineText, { color: accentColor }]}>Editar cuenta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionDestructive, shadow.sm]}
            onPress={handleArchive}
            activeOpacity={0.85}
          >
            <Archive size={16} color={colors.expense} />
            <Text style={styles.actionDestructiveText}>Archivar cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Adjust balance sheet ──────────────────────────────────────────────── */}
      <Modal
        visible={adjustVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAdjustVisible(false)}
      >
        <SafeAreaProvider>
          <TouchableOpacity
            style={sheetStyles.overlay}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setAdjustVisible(false);
            }}
          />
          <SafeAreaView style={sheetStyles.sheetWrap} edges={['bottom']} pointerEvents="box-none">
            <View style={[sheetStyles.sheet, { backgroundColor: colors.bg }]}>
              <View style={[sheetStyles.handle, { backgroundColor: colors.border }]} />
              <View style={sheetStyles.sheetHeader}>
                <View>
                  <Text style={[sheetStyles.sheetTitle, { color: colors.text }]}>
                    Ajustar saldo
                  </Text>
                  <Text style={[sheetStyles.sheetSub, { color: colors.textSecondary }]}>
                    {account.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setAdjustVisible(false);
                  }}
                  style={[sheetStyles.closeBtn, { backgroundColor: colors.card }]}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[sheetStyles.currentLabel, { color: colors.textSecondary }]}>
                Saldo actual:{' '}
                <Text style={{ color: accentColor, fontWeight: '700' }}>
                  {formatCurrency(account.currentBalance, account.currency)}
                </Text>
              </Text>

              <View style={[sheetStyles.amountRow, { backgroundColor: colors.card }, shadow.sm]}>
                <Text style={[sheetStyles.currencySymbol, { color: accentColor }]}>
                  {account.currency === 'EUR' ? '€' : account.currency}
                </Text>
                <TextInput
                  style={[sheetStyles.amountInput, { color: colors.text }]}
                  placeholder="Nuevo saldo"
                  placeholderTextColor={colors.textTertiary}
                  value={newBalance}
                  onChangeText={setNewBalance}
                  keyboardType="decimal-pad"
                  autoFocus
                  selectionColor={accentColor}
                />
              </View>

              <TouchableOpacity
                style={[
                  sheetStyles.confirmBtn,
                  { backgroundColor: newBalance ? accentColor : colors.textTertiary },
                ]}
                onPress={handleAdjust}
                disabled={!newBalance || adjustPending}
                activeOpacity={0.85}
              >
                {adjustPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={sheetStyles.confirmBtnText}>Confirmar ajuste</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      {/* ── Edit form ─────────────────────────────────────────────────────────── */}
      <AccountFormModal
        visible={editVisible}
        account={account}
        onClose={() => {
          setEditVisible(false);
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    navBar: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    navBackBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.sm,
    },

    // Hero
    heroCard: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
      borderRadius: radius.xl,
      padding: spacing.xl,
      paddingTop: 56,
      paddingBottom: spacing.xl,
      alignItems: 'center',
      ...shadow.md,
    },
    heroBack: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: 'rgba(0,0,0,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroEdit: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: 'rgba(0,0,0,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroIconWrap: {
      width: 60,
      height: 60,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    heroName: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    heroSub: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '500',
      marginTop: 4,
      textAlign: 'center',
    },
    heroBalance: {
      fontSize: 38,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -1,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    heroChangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    heroChange: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '500',
    },

    // Stats
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 6,
    },
    statValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },

    // Badges
    badgesRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    badge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Notes
    notesCard: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
    },
    notesLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 6,
    },
    notesText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },

    // Transactions
    section: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    txCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    txRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txDot: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    txInfo: {
      flex: 1,
      minWidth: 0,
    },
    txDesc: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    txMeta: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    txAmount: {
      fontSize: 14,
      fontWeight: '700',
    },
    txEmpty: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    txEmptyText: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    // Actions
    actionsSection: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    actionPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 16,
      borderRadius: radius.full,
    },
    actionPrimaryText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
    actionOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 15,
      borderRadius: radius.full,
      borderWidth: 2,
      backgroundColor: colors.card,
    },
    actionOutlineText: {
      fontSize: 16,
      fontWeight: '700',
    },
    actionDestructive: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 15,
      borderRadius: radius.full,
      backgroundColor: colors.expenseLight,
    },
    actionDestructiveText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.expense,
    },
  });
}

const sheetStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetSub: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  confirmBtn: {
    paddingVertical: 17,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
