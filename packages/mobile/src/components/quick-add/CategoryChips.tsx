/**
 * CategoryChips
 *
 * Horizontally scrollable chip list of the 6 most frequent categories,
 * filtered by the currently selected transaction type.
 *
 * "all" type shows all categories; individual types show only matching ones.
 * Suggestion from NoteInput can highlight a chip (suggestedName prop).
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { TransactionFormType } from '../../schemas/transaction.schemas';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryChipItem {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense' | 'all';
}

interface CategoryChipsProps {
  categories: CategoryChipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  transactionType: TransactionFormType;
  /** Name suggested by NoteInput — chip with this name gets a subtle highlight */
  suggestedName?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByType(
  categories: CategoryChipItem[],
  type: TransactionFormType,
): CategoryChipItem[] {
  if (type === 'transfer') return [];
  return categories.filter(
    (c) => c.type === 'all' || c.type === type,
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
  transactionType,
  suggestedName,
}: CategoryChipsProps): React.JSX.Element {
  const filtered = filterByType(categories, transactionType).slice(0, 6);

  const handleSelect = useCallback(
    async (id: string) => {
      await Haptics.selectionAsync();
      onSelect(id);
    },
    [onSelect],
  );

  if (transactionType === 'transfer') {
    return (
      <View style={styles.section}>
        <Text style={styles.label}>Categoría</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Las transferencias no requieren categoría
          </Text>
        </View>
      </View>
    );
  }

  if (filtered.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.label}>Categoría</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>No hay categorías disponibles</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Categoría</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        accessibilityRole="menu"
        accessible={false}
      >
        {filtered.map((cat) => {
          const isSelected = selectedId === cat.id;
          const isSuggested =
            suggestedName != null &&
            cat.name.toLowerCase() === suggestedName.toLowerCase();

          return (
            <Pressable
              key={cat.id}
              onPress={() => void handleSelect(cat.id)}
              style={[
                styles.chip,
                { borderColor: cat.color },
                isSelected && { backgroundColor: cat.color + '33' },
                !isSelected && isSuggested && styles.chipSuggested,
              ]}
              accessible
              accessibilityRole="menuitem"
              accessibilityLabel={
                isSuggested
                  ? `${cat.name} (sugerido)`
                  : cat.name
              }
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[styles.dot, { backgroundColor: cat.color }]}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected
                    ? { color: cat.color }
                    : styles.chipTextInactive,
                ]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
              {isSuggested && !isSelected ? (
                <View style={styles.suggestionBadge}>
                  <Text style={styles.suggestionBadgeText}>auto</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    maxWidth: 160,
  },
  chipSuggested: {
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  chipTextInactive: {
    color: '#94a3b8',
  },
  suggestionBadge: {
    backgroundColor: '#334155',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  suggestionBadgeText: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoContainer: {
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
  },
});
