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
import { Plus, Pencil, Trash2, Target, CheckCircle2, Calendar, TrendingUp, X } from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  useGoals,
  useUpdateGoal,
  useDeleteGoal,
  calculateMonthlySuggestion,
  type Goal,
} from '@/api/goals';
import { GoalFormModal } from '@/components/GoalFormModal';
import * as Haptics from 'expo-haptics';

// ── Deposit sheet ────────────────────────────────────────────────────────────

interface DepositSheetProps {
  goal: Goal | null;
  colors: ThemeColors;
  shadow: ReturnType<typeof getShadow>;
  onClose: () => void;
}

function DepositSheet({ goal, colors, shadow, onClose }: DepositSheetProps) {
  const styles = useMemo(() => createDepositStyles(colors, shadow), [colors, shadow]);
  const [amount, setAmount] = useState('');
  const { mutate: updateGoal, isPending } = useUpdateGoal();

  const handleDeposit = () => {
    if (!goal || !amount) return;
    const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    if (!cents || cents <= 0) return;
    const newTotal = goal.currentAmount + cents;
    updateGoal(
      { id: goal._id, data: { currentAmount: newTotal } },
      {
        onSuccess: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Keyboard.dismiss();
          setAmount('');
          onClose();
        },
        onError: () => Alert.alert('Error', 'No se pudo registrar la aportación'),
      },
    );
  };

  return (
    <Modal visible={!!goal} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaProvider>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <SafeAreaView style={styles.sheetWrap} edges={['bottom']} pointerEvents="box-none">
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Aportar</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>{goal?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} style={styles.sheetClose} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {goal && (
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  {formatCurrency(goal.currentAmount)}{' '}
                  <Text style={styles.progressTarget}>/ {formatCurrency(goal.targetAmount)}</Text>
                </Text>
                <Text style={styles.progressPct}>
                  {Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))}%
                </Text>
              </View>
            )}

            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: colors.income }]}>€</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
                selectionColor={colors.primary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.depositBtn,
                { backgroundColor: amount ? colors.income : colors.textTertiary },
              ]}
              onPress={handleDeposit}
              disabled={!amount || isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.depositBtnText}>Confirmar aportación</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

// ── Goal card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: Goal;
  styles: ReturnType<typeof createCardStyles>;
  colors: ThemeColors;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onDeposit: (g: Goal) => void;
}

function GoalCard({ goal, styles, colors, onEdit, onDelete, onDeposit }: GoalCardProps) {
  const pct = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;
  const isCompleted = goal.isCompleted || pct >= 100;
  const accentColor = goal.color ?? colors.primary;
  const monthlySuggestion = calculateMonthlySuggestion(goal);

  const barColor = isCompleted
    ? colors.income
    : pct >= 85
    ? '#F59E0B'
    : accentColor;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.colorDot, { backgroundColor: accentColor }]} />
        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        {isCompleted ? (
          <View style={styles.completedBadge}>
            <CheckCircle2 size={12} color={colors.income} />
            <Text style={styles.completedText}>Completada</Text>
          </View>
        ) : (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(goal)} activeOpacity={0.7}>
              <Pencil size={14} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtnStyle]} onPress={() => onDelete(goal._id)} activeOpacity={0.7}>
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
        <Text style={styles.currentAmt}>{formatCurrency(goal.currentAmount)}</Text>
        <Text style={styles.pctText}>{pct}%</Text>
        <Text style={styles.targetAmt}>{formatCurrency(goal.targetAmount)}</Text>
      </View>

      {/* Meta info row */}
      {(goal.deadline || monthlySuggestion) ? (
        <View style={styles.metaRow}>
          {goal.deadline ? (
            <View style={styles.metaChip}>
              <Calendar size={11} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(goal.deadline.split('T')[0], 'long')}</Text>
            </View>
          ) : null}
          {monthlySuggestion && monthlySuggestion > 0 ? (
            <View style={styles.metaChip}>
              <TrendingUp size={11} color={colors.income} />
              <Text style={[styles.metaText, { color: colors.income }]}>
                {formatCurrency(monthlySuggestion)}/mes
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Deposit button */}
      {!isCompleted && (
        <TouchableOpacity
          style={[styles.depositBtn, { borderColor: accentColor }]}
          onPress={() => onDeposit(goal)}
          activeOpacity={0.8}
        >
          <Plus size={14} color={accentColor} />
          <Text style={[styles.depositBtnText, { color: accentColor }]}>Aportar</Text>
        </TouchableOpacity>
      )}

      {/* Completed — only edit/delete */}
      {isCompleted && (
        <View style={styles.completedActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(goal)} activeOpacity={0.7}>
            <Pencil size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtnStyle]} onPress={() => onDelete(goal._id)} activeOpacity={0.7}>
            <Trash2 size={14} color={colors.expense} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);
  const cardStyles = useMemo(() => createCardStyles(colors, shadow), [isDark]);

  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);

  const { data: goals = [], isLoading, refetch } = useGoals();
  const { mutate: deleteGoal } = useDeleteGoal();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormVisible(true);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Eliminar meta',
      '¿Seguro que quieres eliminar esta meta de ahorro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteGoal(id, {
              onError: () => Alert.alert('Error', 'No se pudo eliminar la meta'),
            });
          },
        },
      ],
    );
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setEditingGoal(undefined);
  };

  const active = goals.filter((g) => !g.isCompleted && g.currentAmount < g.targetAmount);
  const completed = goals.filter((g) => g.isCompleted || g.currentAmount >= g.targetAmount);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Metas de ahorro</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditingGoal(undefined); setFormVisible(true); }}
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
        contentContainerStyle={styles.content}
      >
        {isLoading && goals.length === 0 ? (
          <View>
            <Skeleton height={190} borderRadius={24} marginBottom={12} />
            <Skeleton height={190} borderRadius={24} marginBottom={0} />
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Target size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin metas</Text>
            <Text style={styles.emptySubtitle}>
              Define objetivos de ahorro y lleva un seguimiento de tu progreso
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setFormVisible(true)} activeOpacity={0.85}>
              <Plus size={16} color={colors.white} />
              <Text style={styles.emptyBtnText}>Crear meta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <>
                {active.length > 0 && completed.length > 0 && (
                  <Text style={styles.sectionLabel}>En progreso</Text>
                )}
                {active.map((g) => (
                  <GoalCard
                    key={g._id}
                    goal={g}
                    styles={cardStyles}
                    colors={colors}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDeposit={setDepositGoal}
                  />
                ))}
              </>
            )}
            {completed.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Completadas</Text>
                {completed.map((g) => (
                  <GoalCard
                    key={g._id}
                    goal={g}
                    styles={cardStyles}
                    colors={colors}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDeposit={setDepositGoal}
                  />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <GoalFormModal visible={formVisible} goal={editingGoal} onClose={handleCloseForm} />
      <DepositSheet goal={depositGoal} colors={colors} shadow={shadow} onClose={() => setDepositGoal(null)} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    sectionLabel: {
      fontSize: 13, fontWeight: '700', color: colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginBottom: spacing.md, marginTop: spacing.sm,
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

function createCardStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card, borderRadius: radius.xl,
      padding: spacing.xl, marginBottom: spacing.lg, ...shadow.sm,
    },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center',
      gap: spacing.sm, marginBottom: spacing.md,
    },
    colorDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
    goalName: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
    completedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.incomeLight, paddingHorizontal: spacing.sm,
      paddingVertical: 3, borderRadius: radius.full,
    },
    completedText: { fontSize: 11, fontWeight: '700', color: colors.income },
    cardActions: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: {
      width: 32, height: 32, borderRadius: radius.sm,
      backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
    },
    deleteBtnStyle: { backgroundColor: colors.expenseLight },
    progressTrack: {
      height: 10, backgroundColor: colors.border,
      borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm,
    },
    progressFill: { height: '100%', borderRadius: radius.full },
    amountsRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: spacing.sm,
    },
    currentAmt: { fontSize: 15, fontWeight: '700', color: colors.text },
    pctText: { fontSize: 13, fontWeight: '800', color: colors.textSecondary },
    targetAmt: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    metaRow: {
      flexDirection: 'row', gap: spacing.sm,
      flexWrap: 'wrap', marginBottom: spacing.md,
    },
    metaChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.inputBg, paddingHorizontal: spacing.sm,
      paddingVertical: 4, borderRadius: radius.full,
    },
    metaText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    depositBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.sm, paddingVertical: 10, borderRadius: radius.md,
      borderWidth: 1.5, marginTop: spacing.xs,
    },
    depositBtnText: { fontSize: 14, fontWeight: '700' },
    completedActions: {
      flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm,
    },
  });
}

function createDepositStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrap: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
    },
    sheet: {
      backgroundColor: colors.bg, borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl, padding: spacing.xl,
      paddingTop: spacing.md, ...shadow.md,
    },
    sheetHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
    },
    sheetHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: spacing.lg,
    },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    sheetSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    sheetClose: {
      width: 32, height: 32, borderRadius: radius.full,
      backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
    },
    progressRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    progressText: { fontSize: 15, fontWeight: '600', color: colors.text },
    progressTarget: { fontWeight: '400', color: colors.textSecondary },
    progressPct: { fontSize: 15, fontWeight: '700', color: colors.primary },
    amountRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, marginBottom: spacing.lg,
      ...shadow.sm,
    },
    currencySymbol: { fontSize: 22, fontWeight: '800', marginRight: spacing.xs },
    amountInput: {
      flex: 1, paddingVertical: 16, fontSize: 28,
      fontWeight: '700', color: colors.text, letterSpacing: -0.5,
    },
    depositBtn: {
      paddingVertical: 17, borderRadius: radius.full,
      alignItems: 'center', ...shadow.md,
    },
    depositBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  });
}
