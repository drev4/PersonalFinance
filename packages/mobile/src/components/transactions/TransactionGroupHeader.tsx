/**
 * TransactionGroupHeader — sticky date header for transaction groups.
 *
 * Shows "Hoy", "Ayer", or "14 de abril" based on the date key.
 * Also displays the day total (sum of amounts).
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCurrency, formatDate } from '../../lib/formatters';
import type { Transaction } from '../../schemas/transaction.schemas';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransactionGroupHeaderProps {
  dateKey: string;
  transactions: Transaction[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionGroupHeader({
  dateKey,
  transactions,
}: TransactionGroupHeaderProps): React.JSX.Element {
  const label = useMemo(() => {
    // dateKey is "YYYY-MM-DD" — parse as local date
    const [year, month, day] = dateKey.split('-').map(Number);
    if (year === undefined || month === undefined || day === undefined) {
      return dateKey;
    }
    const d = new Date(year, month - 1, day);
    return formatDate(d);
  }, [dateKey]);

  const netAmount = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      if (tx.type === 'income') return acc + tx.amount;
      if (tx.type === 'expense') return acc - tx.amount;
      return acc;
    }, 0);
  }, [transactions]);

  const netColor = netAmount >= 0 ? '#10b981' : '#ef4444';
  const netLabel =
    netAmount >= 0
      ? `+${formatCurrency(netAmount, 'EUR')}`
      : formatCurrency(netAmount, 'EUR');

  return (
    <View style={styles.container} accessibilityRole="header">
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={[styles.netAmount, { color: netColor }]} accessibilityLabel={`Balance del día: ${netLabel}`}>
        {netLabel}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  netAmount: {
    fontSize: 12,
    fontWeight: '600',
  },
});
