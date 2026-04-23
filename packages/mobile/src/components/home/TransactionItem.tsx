/**
 * TransactionItem — single-row transaction with icon, name, category and amount.
 *
 * - income  → emerald amount
 * - expense → red amount (with minus prefix)
 * - transfer → sky (neutral)
 *
 * Tapping navigates to /transaction/[id] (Fase 5 deep link).
 */

import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { DashboardTransaction } from '@/api/hooks/useDashboardSummary';
import { formatCurrency, formatDate } from '@/lib/formatters';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: DashboardTransaction;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface TypeStyle {
  icon: React.JSX.Element;
  iconBg: string;
  amountColor: string;
  sign: string;
}

function typeStyle(type: DashboardTransaction['type']): TypeStyle {
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

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionItem({ transaction }: TransactionItemProps): React.JSX.Element {
  const router = useRouter();
  const style = typeStyle(transaction.type);

  const handlePress = useCallback(() => {
    // Fase 5: route not yet registered
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router.push as (href: string) => void)(`/transaction/${transaction.id}`);
  }, [router, transaction.id]);

  const amountLabel = `${style.sign}${formatCurrency(transaction.amount, transaction.currency)}`;
  const dateLabel = formatDate(transaction.date);
  const a11yLabel = `${transaction.description}, ${amountLabel}, ${dateLabel}${transaction.category ? `, categoría ${transaction.category}` : ''}`;

  return (
    <Pressable
      onPress={handlePress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Abre el detalle de la transacción"
      className="flex-row items-center px-4 py-3 active:bg-slate-800"
    >
      {/* Icon badge */}
      <View
        className="w-9 h-9 rounded-full items-center justify-center mr-3 flex-shrink-0"
        style={{ backgroundColor: style.iconBg }}
      >
        {style.icon}
      </View>

      {/* Description + category */}
      <View className="flex-1 mr-2">
        <Text
          className="text-slate-100 text-sm font-medium"
          numberOfLines={1}
        >
          {transaction.description}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
          {transaction.category ?? dateLabel}
        </Text>
      </View>

      {/* Amount + date */}
      <View className="items-end">
        <Text
          className="text-sm font-semibold"
          style={{ color: style.amountColor }}
        >
          {amountLabel}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">
          {transaction.category ? dateLabel : ''}
        </Text>
      </View>
    </Pressable>
  );
}
