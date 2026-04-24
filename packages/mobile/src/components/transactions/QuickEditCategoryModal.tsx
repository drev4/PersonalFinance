/**
 * QuickEditCategoryModal — bottom-sheet popup to quickly reassign a category.
 *
 * Shows all categories filtered by transaction type.
 * Selecting one fires onSelect and closes the modal.
 */

import { DEFAULT_CATEGORIES } from '@finanzas/shared';
import React, { useCallback, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { TransactionFormType } from '../../schemas/transaction.schemas';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryOption {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense' | 'all';
}

interface QuickEditCategoryModalProps {
  visible: boolean;
  transactionType: TransactionFormType;
  currentCategoryId?: string;
  onSelect: (categoryId: string, categoryName: string, categoryColor: string) => void;
  onClose: () => void;
}

// ─── Static category list ─────────────────────────────────────────────────────

const ALL_CATEGORIES: CategoryOption[] = DEFAULT_CATEGORIES.map((c, idx) => ({
  id: `cat_${idx}_${c.name.toLowerCase().replace(/\s/g, '_')}`,
  name: c.name,
  color: c.color,
  type: c.type === 'income' ? 'income' : 'expense',
}));

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickEditCategoryModal({
  visible,
  transactionType,
  currentCategoryId,
  onSelect,
  onClose,
}: QuickEditCategoryModalProps): React.JSX.Element {
  const categories = useMemo((): CategoryOption[] => {
    if (transactionType === 'transfer') return [];
    return ALL_CATEGORIES.filter((c) => c.type === transactionType);
  }, [transactionType]);

  const handleSelect = useCallback(
    (cat: CategoryOption) => {
      onSelect(cat.id, cat.name, cat.color);
    },
    [onSelect],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessible
        accessibilityLabel="Cerrar selector de categoría"
      />

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title */}
        <Text style={styles.title}>Cambiar categoría</Text>

        {/* Category list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {categories.map((cat) => {
            const isSelected = cat.id === currentCategoryId;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleSelect(cat)}
                style={[
                  styles.categoryRow,
                  isSelected && styles.categoryRowSelected,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                accessibilityState={{ selected: isSelected }}
              >
                {/* Color dot */}
                <View
                  style={[styles.dot, { backgroundColor: cat.color }]}
                />
                <Text
                  style={[
                    styles.categoryName,
                    isSelected && { color: cat.color },
                  ]}
                >
                  {cat.name}
                </Text>
                {isSelected ? (
                  <View style={[styles.checkBadge, { backgroundColor: cat.color }]}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          {categories.length === 0 ? (
            <Text style={styles.emptyText}>
              Las transferencias no tienen categoría
            </Text>
          ) : null}
        </ScrollView>

        {/* Cancel button */}
        <Pressable
          style={styles.cancelButton}
          onPress={onClose}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  listContent: {
    padding: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 2,
    gap: 12,
  },
  categoryRowSelected: {
    backgroundColor: '#0f172a',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    padding: 24,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
