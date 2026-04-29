import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, ChevronLeft, X, Pencil, Trash2 } from 'lucide-react-native';
import { useState, useMemo, useRef, useCallback, memo, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { useTransactions, useAccounts, useCategories, useDeleteTransaction } from '@/api/transactions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { DatePickerCalendar } from '@/components/DatePickerCalendar';
import { EditTransactionModal } from '@/components/EditTransactionModal';

const SWIPE_DELETE_WIDTH = 80;

const SwipeableRow = memo(({
  children,
  onDelete,
  deleteColor,
}: {
  children: ReactNode;
  onDelete: () => void;
  deleteColor: string;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && gs.dx < -8,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(Math.max(-SWIPE_DELETE_WIDTH, Math.min(0, gs.dx)));
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -(SWIPE_DELETE_WIDTH / 2)) {
          Animated.spring(translateX, { toValue: -SWIPE_DELETE_WIDTH, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }, [translateX]);

  return (
    <View style={{ overflow: 'hidden' }}>
      <View style={[swipeStyles.deleteAction, { backgroundColor: deleteColor, width: SWIPE_DELETE_WIDTH }]}>
        <TouchableOpacity
          onPress={() => { close(); onDelete(); }}
          style={swipeStyles.deleteBtn}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color="#fff" />
          <Text style={swipeStyles.deleteBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
});

const swipeStyles = StyleSheet.create({
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    width: SWIPE_DELETE_WIDTH,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});

function getMonthRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

const { from: DEFAULT_FROM, to: DEFAULT_TO } = getMonthRange();

interface Transaction {
  _id?: string;
  id?: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  transferToAccountId?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function getTypeColor(type: string, c: ThemeColors) {
  if (type === 'income') return c.income;
  if (type === 'expense') return c.expense;
  return c.transfer;
}

function getTypeBg(type: string, c: ThemeColors) {
  if (type === 'income') return c.incomeLight;
  if (type === 'expense') return c.expenseLight;
  return c.transferLight;
}

function getTypeLabel(type: string) {
  if (type === 'income') return '↑';
  if (type === 'expense') return '↓';
  return '↔';
}

export default function TransactionsScreen() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<'from' | 'to' | null>(null);

  const { colors, shadow, isDark } = useTheme();
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const { data: accountsData = [] } = useAccounts();
  const { data: categoriesData = [] } = useCategories();

  const filters = {
    from,
    to,
    ...(accountId && { accountId }),
    ...(categoryId && { categoryId }),
    ...(type && { type }),
    page: 1,
    limit: 100,
  };

  const { data: response, isLoading } = useTransactions(filters);

  const categoryMap = useMemo(
    () => Object.fromEntries(categoriesData.map((c) => [c._id, c])),
    [categoriesData],
  );

  const transactions: Transaction[] = response?.data || [];
  const hasActiveFilters =
    from !== DEFAULT_FROM || to !== DEFAULT_TO || accountId || categoryId || type;

  const handleClearFilters = () => {
    setFrom(DEFAULT_FROM);
    setTo(DEFAULT_TO);
    setAccountId('');
    setCategoryId('');
    setType('');
  };

  const handleDateSelect = (date: string) => {
    if (datePickerFor === 'from') {
      setFrom(date);
      if (date > to) setTo(date);
    } else {
      setTo(date);
      if (date < from) setFrom(date);
    }
    setDatePickerFor(null);
  };

  const getTransactionId = (tx: Transaction) => tx._id || tx.id || '';

  const confirmDelete = useCallback((id: string, onSuccess?: () => void) => {
    Alert.alert(
      'Eliminar transacción',
      '¿Estás seguro de que quieres eliminar esta transacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTransaction(id, {
              onSuccess: async () => {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess?.();
              },
              onError: () => Alert.alert('Error', 'No se pudo eliminar la transacción'),
            });
          },
        },
      ],
    );
  }, [deleteTransaction]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Movimientos</Text>
          <Text style={styles.subtitle}>
            {transactions.length > 0
              ? `${transactions.length} transacciones`
              : isLoading
              ? 'Cargando...'
              : 'Historial de movimientos'}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersPanel}>
        <TouchableOpacity
          style={styles.filtersToggle}
          onPress={() => setFiltersOpen(!filtersOpen)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filtersLabel, hasActiveFilters && styles.filtersLabelActive]}>
            Filtros {hasActiveFilters ? '·' : ''}
          </Text>
          {filtersOpen ? (
            <ChevronUp size={16} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {filtersOpen && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            <TouchableOpacity
              style={[styles.chip, styles.chipActive]}
              onPress={() => setDatePickerFor('from')}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipLabel, styles.chipLabelActive]}>Desde</Text>
              <Text style={[styles.chipValue, styles.chipValueActive]}>
                {formatDate(from, 'short')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.chipActive]}
              onPress={() => setDatePickerFor('to')}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipLabel, styles.chipLabelActive]}>Hasta</Text>
              <Text style={[styles.chipValue, styles.chipValueActive]}>
                {formatDate(to, 'short')}
              </Text>
            </TouchableOpacity>
            {accountsData.length > 0 && (
              <TouchableOpacity
                style={[styles.chip, accountId && styles.chipActive]}
                onPress={() => setAccountId(accountId ? '' : accountsData[0]._id)}
              >
                <Text style={[styles.chipLabel, accountId && styles.chipLabelActive]}>Cuenta</Text>
                <Text style={[styles.chipValue, accountId && styles.chipValueActive]}>
                  {accountId
                    ? accountsData.find((a) => a._id === accountId)?.name || 'Todas'
                    : 'Todas'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.chip, type && styles.chipActive]}
              onPress={() => {
                if (type === 'income') setType('expense');
                else if (type === 'expense') setType('transfer');
                else if (type === 'transfer') setType('');
                else setType('income');
              }}
            >
              <Text style={[styles.chipLabel, type && styles.chipLabelActive]}>Tipo</Text>
              <Text style={[styles.chipValue, type && styles.chipValueActive]}>
                {type === 'income'
                  ? 'Ingreso'
                  : type === 'expense'
                  ? 'Gasto'
                  : type === 'transfer'
                  ? 'Transfer.'
                  : 'Todos'}
              </Text>
            </TouchableOpacity>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.chipClear} onPress={handleClearFilters}>
                <Text style={styles.chipClearText}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>Sin transacciones</Text>
          <Text style={styles.emptySubtitle}>No hay resultados con los filtros actuales</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={getTransactionId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SwipeableRow
              onDelete={() => confirmDelete(getTransactionId(item))}
              deleteColor={colors.expense}
            >
              <TouchableOpacity
                style={styles.txRow}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedTransaction(item);
                  setDetailModalVisible(true);
                }}
              >
                <View style={[styles.txIconWrap, { backgroundColor: getTypeBg(item.type, colors) }]}>
                  <Text style={[styles.txIconText, { color: getTypeColor(item.type, colors) }]}>
                    {getTypeLabel(item.type)}
                  </Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDate}>{formatDate(item.date, 'short')}</Text>
                  <Text style={styles.txDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  {item.categoryId && categoryMap[item.categoryId] && (
                    <View
                      style={[
                        styles.categoryPill,
                        { backgroundColor: (categoryMap[item.categoryId].color || '#000') + '18' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          { color: categoryMap[item.categoryId].color || colors.text },
                        ]}
                      >
                        {categoryMap[item.categoryId].name}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.txAmount, { color: getTypeColor(item.type, colors) }]}>
                    {item.type === 'expense' ? '-' : '+'}
                    {formatCurrency(item.amount, item.currency)}
                  </Text>
                </View>
              </TouchableOpacity>
            </SwipeableRow>
          )}
        />
      )}

      {/* Date picker modal */}
      <Modal
        visible={datePickerFor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerFor(null)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onPress={() => setDatePickerFor(null)}
          />
          <View style={styles.dateSheet}>
            <View style={styles.dateSheetHeader}>
              <Text style={styles.dateSheetTitle}>
                {datePickerFor === 'from' ? 'Fecha desde' : 'Fecha hasta'}
              </Text>
              <TouchableOpacity onPress={() => setDatePickerFor(null)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {datePickerFor !== null && (
              <DatePickerCalendar
                selectedDate={datePickerFor === 'from' ? from : to}
                onDateSelect={handleDateSelect}
                colors={colors}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      {selectedTransaction && (
        <EditTransactionModal
          visible={editModalVisible}
          transaction={selectedTransaction}
          onClose={() => setEditModalVisible(false)}
        />
      )}

      {/* Detail Modal */}
      {selectedTransaction && (
        <Modal
          visible={detailModalVisible}
          animationType="slide"
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <SafeAreaProvider>
            <SafeAreaView style={styles.modalSafe} edges={['top', 'left', 'right']}>
              <View style={styles.modalNav}>
                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  style={styles.backButton}
                >
                  <ChevronLeft size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalNavTitle}>Detalle</Text>
                <View style={{ width: 36 }} />
              </View>

              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Amount hero */}
                <View style={styles.amountHero}>
                  <View
                    style={[
                      styles.amountHeroIcon,
                      { backgroundColor: getTypeBg(selectedTransaction.type, colors) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.amountHeroIconText,
                        { color: getTypeColor(selectedTransaction.type, colors) },
                      ]}
                    >
                      {getTypeLabel(selectedTransaction.type)}
                    </Text>
                  </View>
                  <Text style={styles.amountHeroLabel}>Monto</Text>
                  <Text
                    style={[
                      styles.amountHeroValue,
                      { color: getTypeColor(selectedTransaction.type, colors) },
                    ]}
                  >
                    {selectedTransaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </Text>
                </View>

                {/* Details card */}
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Descripción</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.description}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fecha</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedTransaction.date, 'long')}
                    </Text>
                  </View>

                  {(() => {
                    const isTransfer = selectedTransaction.type === 'transfer';
                    const account = accountsData.find(
                      (a) => a._id === selectedTransaction.accountId,
                    );
                    const destAccount = isTransfer
                      ? accountsData.find((a) => a._id === selectedTransaction.transferToAccountId)
                      : null;
                    return (
                      <>
                        {account && (
                          <>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>
                                {isTransfer ? 'Origen' : 'Cuenta'}
                              </Text>
                              <View style={styles.detailRight}>
                                <Text style={styles.detailValue}>{account.name}</Text>
                                <Text style={styles.detailSub}>
                                  Saldo: {formatCurrency(account.currentBalance, account.currency)}
                                </Text>
                              </View>
                            </View>
                          </>
                        )}
                        {isTransfer && destAccount && (
                          <>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Destino</Text>
                              <View style={styles.detailRight}>
                                <Text style={styles.detailValue}>{destAccount.name}</Text>
                                <Text style={styles.detailSub}>
                                  Saldo:{' '}
                                  {formatCurrency(
                                    destAccount.currentBalance,
                                    destAccount.currency,
                                  )}
                                </Text>
                              </View>
                            </View>
                          </>
                        )}
                      </>
                    );
                  })()}

                  {selectedTransaction.type !== 'transfer' &&
                    selectedTransaction.categoryId &&
                    categoryMap[selectedTransaction.categoryId] && (
                      <>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Categoría</Text>
                          <View
                            style={[
                              styles.categoryPill,
                              {
                                backgroundColor:
                                  (categoryMap[selectedTransaction.categoryId].color || '#000') +
                                  '18',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryPillText,
                                {
                                  color:
                                    categoryMap[selectedTransaction.categoryId].color ||
                                    colors.text,
                                },
                              ]}
                            >
                              {categoryMap[selectedTransaction.categoryId].name}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}

                  {selectedTransaction.notes && (
                    <>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Notas</Text>
                        <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>
                          {selectedTransaction.notes}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.detailActions}>
                  {selectedTransaction.type !== 'transfer' && (
                    <TouchableOpacity
                      style={styles.detailEditBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setDetailModalVisible(false);
                        setEditModalVisible(true);
                      }}
                    >
                      <Pencil size={16} color={colors.primary} />
                      <Text style={[styles.detailActionText, { color: colors.primary }]}>Editar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.detailDeleteBtn}
                    activeOpacity={0.7}
                    onPress={() =>
                      confirmDelete(getTransactionId(selectedTransaction), () => {
                        setDetailModalVisible(false);
                        setSelectedTransaction(null);
                      })
                    }
                  >
                    <Trash2 size={16} color={colors.expense} />
                    <Text style={[styles.detailActionText, { color: colors.expense }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>
      )}
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
    subtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 4,
    },
    filtersPanel: {
      backgroundColor: colors.bg,
      paddingBottom: spacing.sm,
    },
    filtersToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
    },
    filtersLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filtersLabelActive: {
      color: colors.primary,
    },
    filterChips: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderRadius: radius.full,
      ...shadow.sm,
    },
    chipActive: {
      backgroundColor: colors.primaryLight,
    },
    chipLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    chipLabelActive: {
      color: colors.primary,
    },
    chipValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    chipValueActive: {
      color: colors.primary,
    },
    chipClear: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: colors.expenseLight,
      borderRadius: radius.full,
      justifyContent: 'center',
    },
    chipClearText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.expense,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 100,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    txIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    txIconText: {
      fontSize: 18,
      fontWeight: '800',
    },
    txInfo: {
      flex: 1,
    },
    txDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 3,
    },
    txDescription: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    txRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    categoryPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    categoryPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    txAmount: {
      fontSize: 15,
      fontWeight: '700',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xxxl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalSafe: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    modalNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.sm,
    },
    modalNavTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
    modalContent: {
      flex: 1,
      padding: spacing.xl,
    },
    amountHero: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      marginBottom: spacing.xl,
    },
    amountHeroIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    amountHeroIconText: {
      fontSize: 28,
      fontWeight: '800',
    },
    amountHeroLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    amountHeroValue: {
      fontSize: 44,
      fontWeight: '800',
      letterSpacing: -1,
    },
    detailCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
      ...shadow.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    detailDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    detailValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    detailSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'right',
    },
    detailRight: {
      alignItems: 'flex-end',
    },
    dateSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: 40,
    },
    dateSheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    dateSheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    detailActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xl,
      marginBottom: spacing.xxxl,
    },
    detailEditBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    detailDeleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.expense,
    },
    detailActionText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
