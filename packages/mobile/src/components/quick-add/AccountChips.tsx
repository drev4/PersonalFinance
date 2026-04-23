/**
 * AccountChips
 *
 * Horizontal scrollable list of account chips.
 * Shows up to 5 accounts, ordered by frequency (most used first).
 * The last-used account is pre-selected when the sheet opens.
 *
 * Chip style: border colored with account color (or sky-blue default).
 * Selected chip: filled background; unselected: transparent.
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccountChipItem {
  id: string;
  name: string;
  color?: string;
  currency: string;
  balance: number;
}

interface AccountChipsProps {
  accounts: AccountChipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_COLOR = '#0ea5e9';

function chipColor(account: AccountChipItem): string {
  return account.color ?? DEFAULT_COLOR;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AccountChips({
  accounts,
  selectedId,
  onSelect,
}: AccountChipsProps): React.JSX.Element {
  const handleSelect = useCallback(
    async (id: string) => {
      await Haptics.selectionAsync();
      onSelect(id);
    },
    [onSelect],
  );

  if (accounts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay cuentas disponibles</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Cuenta</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        accessibilityRole="menu"
        accessible={false}
      >
        {accounts.slice(0, 5).map((account) => {
          const color = chipColor(account);
          const isSelected = selectedId === account.id;

          return (
            <Pressable
              key={account.id}
              onPress={() => void handleSelect(account.id)}
              style={[
                styles.chip,
                { borderColor: color },
                isSelected && { backgroundColor: color + '33' },
              ]}
              accessible
              accessibilityRole="menuitem"
              accessibilityLabel={account.name}
              accessibilityState={{ selected: isSelected }}
            >
              {/* Color dot */}
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text
                style={[
                  styles.chipText,
                  isSelected ? { color } : styles.chipTextInactive,
                ]}
                numberOfLines={1}
              >
                {account.name}
              </Text>
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
  emptyContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
});
