/**
 * TransactionItem — swipeable transaction row for the list view.
 *
 * Swipe left  → red "Borrar" action → shows native Alert confirmation.
 * Swipe right → blue "Categoría" action → opens QuickEditCategoryModal.
 *
 * Uses ReanimatedSwipeable from react-native-gesture-handler.
 */

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { formatCurrency, formatDate } from '../../lib/formatters';
import type { Transaction } from '../../schemas/transaction.schemas';
import { showDeleteConfirmation } from './DeleteConfirmationDialog';
import { QuickEditCategoryModal } from './QuickEditCategoryModal';

// ─── Type helpers ─────────────────────────────────────────────────────────────

interface TypeStyle {
  icon: React.JSX.Element;
  iconBg: string;
  amountColor: string;
  sign: string;
}

function getTypeStyle(type: Transaction['type']): TypeStyle {
  switch (type) {
    case 'income':
      return {
        icon: <ArrowDownLeft size={16} color="#10b981" strokeWidth={2.5} />,
        iconBg: '#064e3b',
        amountColor: '#10b981',
        sign: '+',
      };
    case 'expense':
      return {
        icon: <ArrowUpRight size={16} color="#ef4444" strokeWidth={2.5} />,
        iconBg: '#450a0a',
        amountColor: '#ef4444',
        sign: '-',
      };
    case 'transfer':
    default:
      return {
        icon: <ArrowLeftRight size={16} color="#38bdf8" strokeWidth={2.5} />,
        iconBg: '#0c4a6e',
        amountColor: '#38bdf8',
        sign: '',
      };
  }
}

// ─── Swipe action renders ─────────────────────────────────────────────────────

function RightAction(
  _progress: SharedValue<number>,
  _drag: SharedValue<number>,
  onDelete: () => void,
): React.JSX.Element {
  const style = useAnimatedStyle(() => ({
    // keep full height
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'flex-end' as const,
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        style={styles.deleteAction}
        onPress={onDelete}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Borrar transacción"
      >
        <Text style={styles.deleteActionText}>Borrar</Text>
      </Pressable>
    </Animated.View>
  );
}

function LeftAction(
  _progress: SharedValue<number>,
  _drag: SharedValue<number>,
  onEdit: () => void,
): React.JSX.Element {
  const style = useAnimatedStyle(() => ({
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'flex-start' as const,
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        style={styles.editAction}
        onPress={onEdit}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Editar categoría"
      >
        <Text style={styles.editActionText}>Categoría</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onCategoryUpdate: (
    transactionId: string,
    categoryId: string,
    categoryName: string,
    categoryColor: string,
  ) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionItem({
  transaction,
  onDelete,
  onCategoryUpdate,
}: TransactionItemProps): React.JSX.Element {
  const router = useRouter();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const style = getTypeStyle(transaction.type);

  const description =
    transaction.note ??
    transaction.categoryName ??
    (transaction.type === 'expense'
      ? 'Gasto'
      : transaction.type === 'income'
      ? 'Ingreso'
      : 'Transferencia');

  const amountLabel = `${style.sign}${formatCurrency(transaction.amount, transaction.currency)}`;
  const dateLabel = formatDate(transaction.date);
  const subLabel = transaction.categoryName ?? transaction.accountName ?? dateLabel;

  const isPending = transaction.status === 'pending';

  const a11yLabel = `${description}, ${amountLabel}, ${dateLabel}${
    transaction.categoryName ? `, categoría ${transaction.categoryName}` : ''
  }${isPending ? ', pendiente de sincronización' : ''}`;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePress = useCallback(() => {
    (router.push as (href: string) => void)(`/transaction/${transaction.id}`);
  }, [router, transaction.id]);

  const handleDeleteRequest = useCallback(() => {
    swipeableRef.current?.close();
    showDeleteConfirmation({
      onConfirm: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete(transaction.id);
      },
    });
  }, [onDelete, transaction.id]);

  const handleEditCategoryRequest = useCallback(() => {
    swipeableRef.current?.close();
    void Haptics.selectionAsync();
    setCategoryModalVisible(true);
  }, []);

  const handleCategorySelect = useCallback(
    (categoryId: string, categoryName: string, categoryColor: string) => {
      setCategoryModalVisible(false);
      onCategoryUpdate(transaction.id, categoryId, categoryName, categoryColor);
    },
    [onCategoryUpdate, transaction.id],
  );

  const renderRightActions = useCallback(
    (progress: SharedValue<number>, drag: SharedValue<number>) =>
      RightAction(progress, drag, handleDeleteRequest),
    [handleDeleteRequest],
  );

  const renderLeftActions = useCallback(
    (progress: SharedValue<number>, drag: SharedValue<number>) =>
      LeftAction(progress, drag, handleEditCategoryRequest),
    [handleEditCategoryRequest],
  );

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        rightThreshold={60}
        leftThreshold={60}
        friction={2}
        overshootRight={false}
        overshootLeft={false}
        containerStyle={styles.swipeContainer}
      >
        <Pressable
          onPress={handlePress}
          accessible
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint="Abre el detalle de la transacción"
          style={[styles.row, isPending && styles.rowPending]}
        >
          {/* Icon badge */}
          <View
            style={[styles.iconBadge, { backgroundColor: style.iconBg }]}
            accessibilityElementsHidden
          >
            {style.icon}
          </View>

          {/* Description + sub-label */}
          <View style={styles.textBlock}>
            <Text
              style={[styles.description, isPending && styles.textPending]}
              numberOfLines={1}
            >
              {description}
            </Text>
            <Text style={styles.subLabel} numberOfLines={1}>
              {subLabel}
            </Text>
          </View>

          {/* Amount + date */}
          <View style={styles.amountBlock}>
            <Text
              style={[styles.amount, { color: style.amountColor }]}
            >
              {amountLabel}
            </Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>

          {/* Pending indicator */}
          {isPending ? <View style={styles.pendingDot} /> : null}
        </Pressable>
      </ReanimatedSwipeable>

      {/* Quick category edit modal */}
      <QuickEditCategoryModal
        visible={categoryModalVisible}
        transactionType={transaction.type}
        currentCategoryId={transaction.categoryId}
        onSelect={handleCategorySelect}
        onClose={() => setCategoryModalVisible(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  swipeContainer: {
    backgroundColor: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    minHeight: 60,
  },
  rowPending: {
    opacity: 0.75,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  textPending: {
    color: '#94a3b8',
  },
  subLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginLeft: 6,
    alignSelf: 'center',
  },
  // Swipe actions
  deleteAction: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    flex: 1,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  editAction: {
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    flex: 1,
  },
  editActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
