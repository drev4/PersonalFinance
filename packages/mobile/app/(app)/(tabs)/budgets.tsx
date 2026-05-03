import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo, memo } from 'react';
import type React from 'react';
import { Plus, Pencil, Trash2, ChartPie, AlertTriangle } from 'lucide-react-native';
import { radius, spacing, type ThemeColors, getShadow } from '@/theme';
import { useTheme } from '@/theme/useTheme';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { useBudgets, useBudgetProgress, useDeleteBudget, type Budget } from '@/api/budgets';
import { BudgetFormModal } from '@/components/BudgetFormModal';
import * as Haptics from 'expo-haptics';

// ── Budget progress card ────────────────────────────────────────────────────

const PERIOD_LABEL: Record<string, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
};

interface BudgetCardProps {
  budget: Budget;
  colors: ThemeColors;
  shadow: ReturnType<typeof getShadow>;
  onEdit: (b: Budget) => void;
  onDelete: (id: string) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = memo(({ budget, colors, shadow, onEdit, onDelete }) => {
  const styles = useMemo(() => createCardStyles(colors, shadow), [colors, shadow]);
  const { data: progress, isLoading } = useBudgetProgress(budget._id);

  const overallPct = progress ? Math.min(progress.percentageUsed, 100) : 0;
  const overallColor =
    !progress || progress.percentageUsed <= 60
      ? colors.income
      : progress.percentageUsed <= 85
      ? '#F59E0B'
      : colors.expense;

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.budgetName} numberOfLines={1}>
            {budget.name}
          </Text>
          <View style={styles.periodPill}>
            <Text style={styles.periodPillText}>{PERIOD_LABEL[budget.period] ?? budget.period}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onEdit(budget)}
            activeOpacity={0.7}
          >
            <Pencil size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => onDelete(budget._id)}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={colors.expense} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading || !progress ? (
        <View style={styles.skeletonArea}>
          <Skeleton height={8} borderRadius={4} marginBottom={8} />
          <Skeleton width="60%" height={12} marginBottom={12} />
          <Skeleton height={8} borderRadius={4} marginBottom={6} />
          <Skeleton height={8} borderRadius={4} marginBottom={0} />
        </View>
      ) : (
        <>
          {/* Overall totals */}
          <View style={styles.totalsRow}>
            <Text style={styles.spentAmount}>
              {formatCurrency(progress.totalSpent)}{' '}
              <Text style={styles.budgetedAmount}>/ {formatCurrency(progress.totalBudgeted)}</Text>
            </Text>
            <Text style={[styles.pctLabel, { color: overallColor }]}>
              {progress.percentageUsed.toFixed(0)}%
            </Text>
          </View>

          {/* Overall bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${overallPct}%`, backgroundColor: overallColor },
              ]}
            />
          </View>

          {/* Items breakdown */}
          {progress.items.length > 0 && (
            <View style={styles.itemsArea}>
              {progress.items.map((item) => {
                const itemPct = Math.min(item.percentageUsed, 100);
                const itemColor =
                  item.status === 'ok'
                    ? colors.income
                    : item.status === 'warning'
                    ? '#F59E0B'
                    : colors.expense;

                return (
                  <View key={item.categoryId} style={styles.itemRow}>
                    <View style={styles.itemMeta}>
                      <View
                        style={[styles.catDot, { backgroundColor: item.categoryColor || colors.textTertiary }]}
                      />
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.categoryName}
                      </Text>
                      {item.status !== 'ok' && (
                        <AlertTriangle size={12} color={itemColor} />
                      )}
                      <Text style={[styles.itemPct, { color: itemColor }]}>
                        {item.percentageUsed.toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.itemAmounts}>
                      <Text style={styles.itemSpent}>{formatCurrency(item.spent)}</Text>
                      <Text style={styles.itemBudgeted}>/ {formatCurrency(item.budgeted)}</Text>
                    </View>
                    <View style={styles.itemTrack}>
                      <View
                        style={[
                          styles.itemFill,
                          { width: `${itemPct}%`, backgroundColor: itemColor },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
});

BudgetCard.displayName = 'BudgetCard';

// ── Main screen ─────────────────────────────────────────────────────────────

export default function BudgetsScreen() {
  const { colors, shadow, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [isDark]);

  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();

  const { data: budgets = [], isLoading, refetch } = useBudgets();
  const { mutate: deleteBudget } = useDeleteBudget();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormVisible(true);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Eliminar presupuesto',
      '¿Seguro que quieres eliminar este presupuesto? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteBudget(id, {
              onError: () => Alert.alert('Error', 'No se pudo eliminar el presupuesto'),
            });
          },
        },
      ],
    );
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setEditingBudget(undefined);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Presupuestos</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditingBudget(undefined); setFormVisible(true); }}
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
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        {isLoading && budgets.length === 0 ? (
          // Skeleton loading state
          <View>
            <Skeleton height={180} borderRadius={24} marginBottom={12} />
            <Skeleton height={180} borderRadius={24} marginBottom={0} />
          </View>
        ) : budgets.length === 0 ? (
          // Empty state
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <ChartPie size={32} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sin presupuestos</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer presupuesto para controlar tus gastos por categoría
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setFormVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={16} color={colors.white} />
              <Text style={styles.emptyBtnText}>Crear presupuesto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          budgets.map((b) => (
            <BudgetCard
              key={b._id}
              budget={b}
              colors={colors}
              shadow={shadow}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BudgetFormModal
        visible={formVisible}
        budget={editingBudget}
        onClose={handleCloseForm}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors, shadow: ReturnType<typeof getShadow>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: colors.text,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadow.sm,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: spacing.xxxl,
    },
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
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
    },
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
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      ...shadow.sm,
    },
    emptyBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.white,
    },
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
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    cardTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
      marginRight: spacing.sm,
    },
    budgetName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    periodPill: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    periodPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    cardActions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteBtn: {
      backgroundColor: colors.expenseLight,
    },
    skeletonArea: {
      paddingTop: spacing.sm,
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    spentAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    budgetedAmount: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    pctLabel: {
      fontSize: 16,
      fontWeight: '800',
    },
    progressTrack: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    itemsArea: {
      gap: spacing.md,
    },
    itemRow: {
      gap: 6,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    catDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    itemName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    itemPct: {
      fontSize: 12,
      fontWeight: '700',
    },
    itemAmounts: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
    },
    itemSpent: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    itemBudgeted: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    itemTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    itemFill: {
      height: '100%',
      borderRadius: radius.full,
    },
  });
}
