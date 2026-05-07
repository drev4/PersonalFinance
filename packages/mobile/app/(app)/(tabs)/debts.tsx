import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  CheckCircle2,
  Calendar,
  X,
  Info,
} from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useDebts, usePayDebt, useDeleteDebt, TYPE_LABELS, type Debt } from '@/api/debts';
import { DebtFormModal } from '@/components/DebtFormModal';
import * as Haptics from 'expo-haptics';

// ── Payment sheet ─────────────────────────────────────────────────────────────

interface PaymentSheetProps {
  debt: Debt | null;
  colors: ThemeColors;
  shadow: ReturnType<typeof getShadow>;
  onClose: () => void;
}

function PaymentSheet({ debt, colors, shadow, onClose }: PaymentSheetProps) {
  const styles = useMemo(() => createPaymentStyles(colors, shadow), [colors, shadow]);
  const [amount, setAmount] = useState('');
  const { mutate: payDebt, isPending } = usePayDebt();

  const handlePay = () => {
    if (!debt || !amount) return;
    const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    if (!cents || cents <= 0) return;
    payDebt(
      { id: debt._id, amount: cents },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          setAmount('');
          onClose();
        },
        onError: () => Alert.alert('Error', 'No se pudo registrar el pago'),
      },
    );
  };

  const cents = Math.round(parseFloat(amount.replace(',', '.') || '0') * 100);
  const newBalance = debt ? Math.max(0, debt.currentBalance - cents) : 0;
  const minHint =
    debt && debt.minimumPayment > 0 ? formatCurrency(debt.minimumPayment, debt.currency) : null;

  return (
    <Modal visible={!!debt} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaProvider>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <SafeAreaView style={styles.sheetWrap} edges={['bottom']} pointerEvents="box-none">
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Registrar pago</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {debt?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                style={styles.sheetClose}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {debt && (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Saldo restante</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(debt.currentBalance, debt.currency)}
                </Text>
              </View>
            )}

            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: colors.expense }]}>
                {debt?.currency ?? '€'}
              </Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
                selectionColor={colors.expense}
              />
            </View>

            {minHint && <Text style={styles.hintText}>Pago mínimo sugerido: {minHint}</Text>}

            {cents > 0 && debt && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Saldo tras el pago:</Text>
                <Text style={styles.previewValue}>{formatCurrency(newBalance, debt.currency)}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.payBtn,
                { backgroundColor: amount ? colors.expense : colors.textTertiary },
              ]}
              onPress={handlePay}
              disabled={!amount || isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.payBtnText}>Confirmar pago</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

// ── Debt card ─────────────────────────────────────────────────────────────────

interface DebtCardProps {
  debt: Debt;
  styles: ReturnType<typeof createCardStyles>;
  colors: ThemeColors;
  onEdit: (d: Debt) => void;
  onDelete: (id: string) => void;
  onPay: (d: Debt) => void;
}

function DebtCard({ debt, styles, colors, onEdit, onDelete, onPay }: DebtCardProps) {
  const pct =
    debt.originalAmount > 0
      ? Math.min(100, ((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100)
      : 0;
  const accentColor = debt.color ?? colors.expense;
  const info = debt.info;

  const barColor = debt.isPaidOff ? colors.income : accentColor;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.colorDot, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.debtName} numberOfLines={1}>
            {debt.name}
          </Text>
          <Text style={styles.debtType}>{TYPE_LABELS[debt.type]}</Text>
        </View>
        {debt.isPaidOff ? (
          <View style={styles.paidBadge}>
            <CheckCircle2 size={12} color={colors.income} />
            <Text style={styles.paidText}>Pagada</Text>
          </View>
        ) : (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onEdit(debt)}
              activeOpacity={0.7}
            >
              <Pencil size={14} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtnStyle]}
              onPress={() => onDelete(debt._id)}
              activeOpacity={0.7}
            >
              <Trash2 size={14} color={colors.expense} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>

      {/* Amounts */}
      <View style={styles.amountsRow}>
        <Text style={styles.balanceTxt}>{formatCurrency(debt.currentBalance, debt.currency)}</Text>
        <Text style={styles.pctTxt}>{pct.toFixed(1)}%</Text>
        <Text style={styles.originalTxt}>{formatCurrency(debt.originalAmount, debt.currency)}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Interés</Text>
          <Text style={styles.statValue}>{debt.interestRate.toFixed(2)}%</Text>
        </View>
        {debt.minimumPayment > 0 && (
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Pago mín.</Text>
            <Text style={styles.statValue}>
              {formatCurrency(debt.minimumPayment, debt.currency)}/mes
            </Text>
          </View>
        )}
        {info?.monthsToPayoff != null && (
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Liquidación</Text>
            <Text style={styles.statValue}>
              {info.monthsToPayoff < 12
                ? `${info.monthsToPayoff}m`
                : `${(info.monthsToPayoff / 12).toFixed(1)}a`}
            </Text>
          </View>
        )}
      </View>

      {/* Warning if payment doesn't cover interest */}
      {info?.monthsToPayoff === null && !debt.isPaidOff && (
        <View style={[styles.warnChip, { backgroundColor: colors.expenseLight }]}>
          <Info size={11} color={colors.expense} />
          <Text style={[styles.warnText, { color: colors.expense }]}>
            El pago mínimo no cubre los intereses
          </Text>
        </View>
      )}

      {/* Next payment date */}
      {debt.nextPaymentDate && !debt.isPaidOff && (
        <View style={styles.metaRow}>
          <Calendar size={11} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            Próximo: {formatDate(debt.nextPaymentDate.split('T')[0], 'long')}
          </Text>
        </View>
      )}

      {/* Pay button */}
      {!debt.isPaidOff && (
        <TouchableOpacity
          style={[styles.payBtn, { borderColor: accentColor }]}
          onPress={() => onPay(debt)}
          activeOpacity={0.8}
        >
          <Plus size={14} color={accentColor} />
          <Text style={[styles.payBtnText, { color: accentColor }]}>Registrar pago</Text>
        </TouchableOpacity>
      )}

      {/* Completed actions */}
      {debt.isPaidOff && (
        <View style={styles.completedActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(debt)}
            activeOpacity={0.7}
          >
            <Pencil size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtnStyle]}
            onPress={() => onDelete(debt._id)}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={colors.expense} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DebtsScreen() {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);
  const cardStyles = useMemo(() => createCardStyles(colors, shadow), [isDark]);

  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>();
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  const { data: debts = [], isLoading, refetch } = useDebts();
  const { mutate: deleteDebt } = useDeleteDebt();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormVisible(true);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Eliminar deuda', '¿Seguro que quieres eliminar esta deuda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteDebt(id, {
            onError: () => Alert.alert('Error', 'No se pudo eliminar la deuda'),
          });
        },
      },
    ]);
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setEditingDebt(undefined);
  };

  const active = debts.filter((d) => !d.isPaidOff);
  const paid = debts.filter((d) => d.isPaidOff);

  const totalBalance = active.reduce((s, d) => s + d.currentBalance, 0);
  const totalOriginal = active.reduce((s, d) => s + d.originalAmount, 0);
  const paidPct =
    totalOriginal > 0 ? Math.min(100, ((totalOriginal - totalBalance) / totalOriginal) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Deudas</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setEditingDebt(undefined);
            setFormVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.expense}
          />
        }
        contentContainerStyle={styles.content}
      >
        {isLoading && debts.length === 0 ? (
          <View>
            <Skeleton height={200} borderRadius={24} marginBottom={12} />
            <Skeleton height={200} borderRadius={24} marginBottom={0} />
          </View>
        ) : debts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <TrendingDown size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin deudas</Text>
            <Text style={styles.emptySubtitle}>
              Registra tus deudas para planificar su liquidación
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.expense }]}
              onPress={() => setFormVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={16} color={colors.white} />
              <Text style={styles.emptyBtnText}>Añadir deuda</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary card */}
            {active.length > 0 && (
              <View style={[styles.summaryCard, shadow.sm]}>
                <Text style={styles.summaryTitle}>Deuda total activa</Text>
                <Text style={[styles.summaryAmount, { color: colors.expense }]}>
                  {formatCurrency(totalBalance)}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
                </View>
                <Text style={styles.summarySubtext}>
                  {paidPct.toFixed(1)}% pagado de la deuda original
                </Text>
              </View>
            )}

            {active.length > 0 && (
              <>
                {paid.length > 0 && <Text style={styles.sectionLabel}>Activas</Text>}
                {active.map((d) => (
                  <DebtCard
                    key={d._id}
                    debt={d}
                    styles={cardStyles}
                    colors={colors}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPay={setPayingDebt}
                  />
                ))}
              </>
            )}

            {paid.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Liquidadas</Text>
                {paid.map((d) => (
                  <DebtCard
                    key={d._id}
                    debt={d}
                    styles={cardStyles}
                    colors={colors}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPay={setPayingDebt}
                  />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <DebtFormModal visible={formVisible} debt={editingDebt} onClose={handleCloseForm} />
      <PaymentSheet
        debt={payingDebt}
        colors={colors}
        shadow={shadow}
        onClose={() => setPayingDebt(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.expense,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.sm,
    },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginBottom: spacing.xl,
    },
    summaryTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    summaryAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: spacing.md },
    progressTrack: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
      backgroundColor: '#10b981',
    },
    summarySubtext: { fontSize: 12, color: colors.textSecondary },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xxxl },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
      ...shadow.sm,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.xxl,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      ...shadow.sm,
    },
    emptyBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  });
}

function createCardStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadow.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    colorDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0, marginTop: 3 },
    debtName: { fontSize: 17, fontWeight: '700', color: colors.text },
    debtType: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    paidBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.incomeLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    paidText: { fontSize: 11, fontWeight: '700', color: colors.income },
    cardActions: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteBtnStyle: { backgroundColor: colors.expenseLight },
    progressTrack: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    },
    progressFill: { height: '100%', borderRadius: radius.full },
    amountsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    balanceTxt: { fontSize: 15, fontWeight: '700', color: colors.expense },
    pctTxt: { fontSize: 12, fontWeight: '800', color: colors.textSecondary },
    originalTxt: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
    statsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
    statChip: {
      backgroundColor: colors.inputBg,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
    },
    statLabel: { fontSize: 10, color: colors.textTertiary },
    statValue: { fontSize: 12, fontWeight: '700', color: colors.text },
    warnChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radius.sm,
      marginBottom: spacing.sm,
    },
    warnText: { fontSize: 11, fontWeight: '600' },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: spacing.md,
    },
    metaText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    payBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1.5,
      marginTop: spacing.xs,
    },
    payBtnText: { fontSize: 14, fontWeight: '700' },
    completedActions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
  });
}

function createPaymentStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingTop: spacing.md,
      ...shadow.md,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    sheetSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    sheetClose: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    balanceLabel: { fontSize: 14, color: colors.textSecondary },
    balanceValue: { fontSize: 14, fontWeight: '700', color: colors.expense },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      ...shadow.sm,
    },
    currencySymbol: { fontSize: 22, fontWeight: '800', marginRight: spacing.xs },
    amountInput: {
      flex: 1,
      paddingVertical: 16,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    hintText: { fontSize: 12, color: colors.textTertiary, marginBottom: spacing.md },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      marginBottom: spacing.md,
      ...shadow.sm,
    },
    previewLabel: { fontSize: 13, color: colors.textSecondary },
    previewValue: { fontSize: 13, fontWeight: '700', color: colors.text },
    payBtn: {
      paddingVertical: 17,
      borderRadius: radius.full,
      alignItems: 'center',
      ...shadow.md,
    },
    payBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  });
}
