/**
 * TransactionTypeSelector
 *
 * Three large buttons rendered at the top of the Quick Add sheet.
 * Pressing a button selects the transaction type and applies the
 * correct colour accent.
 *
 * Accessibility: each button declares role="button" and the selected
 * state via accessibilityState.selected.
 */

import * as Haptics from 'expo-haptics';
import {
  ArrowDownCircle,
  ArrowRightCircle,
  ArrowUpCircle,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionFormType } from '../../schemas/transaction.schemas';

// ─── Config ───────────────────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  color: string;
  bg: string;
  selectedBg: string;
  Icon: LucideIcon;
}

const TYPE_CONFIG: Record<TransactionFormType, TypeConfig> = {
  expense: {
    label: 'Gasto',
    color: '#ef4444',
    bg: '#1c0a0a',
    selectedBg: '#450a0a',
    Icon: ArrowDownCircle,
  },
  income: {
    label: 'Ingreso',
    color: '#10b981',
    bg: '#022c22',
    selectedBg: '#064e3b',
    Icon: ArrowUpCircle,
  },
  transfer: {
    label: 'Transfer.',
    color: '#94a3b8',
    bg: '#0f172a',
    selectedBg: '#1e293b',
    Icon: ArrowRightCircle,
  },
};

const TYPES: TransactionFormType[] = ['expense', 'income', 'transfer'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransactionTypeSelectorProps {
  selected: TransactionFormType;
  onChange: (type: TransactionFormType) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionTypeSelector({
  selected,
  onChange,
}: TransactionTypeSelectorProps): React.JSX.Element {
  const handlePress = useCallback(
    async (type: TransactionFormType) => {
      await Haptics.selectionAsync();
      onChange(type);
    },
    [onChange],
  );

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessible={false}>
      {TYPES.map((type) => {
        const cfg = TYPE_CONFIG[type];
        const isSelected = selected === type;
        const Icon = cfg.Icon;

        return (
          <Pressable
            key={type}
            onPress={() => void handlePress(type)}
            style={[
              styles.button,
              { backgroundColor: isSelected ? cfg.selectedBg : cfg.bg },
              isSelected && { borderColor: cfg.color, borderWidth: 2 },
            ]}
            accessible
            accessibilityRole="radio"
            accessibilityLabel={cfg.label}
            accessibilityState={{ selected: isSelected }}
          >
            <Icon size={26} color={cfg.color} strokeWidth={1.8} />
            <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
