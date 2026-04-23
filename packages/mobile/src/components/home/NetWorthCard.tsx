/**
 * NetWorthCard — displays total net worth with 24h and 30d change indicators.
 *
 * Accessibility: the whole card is a readable region with a combined label.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { formatCurrency, formatPercent } from '@/lib/formatters';

// ─── Props ────────────────────────────────────────────────────────────────────

interface NetWorthCardProps {
  netWorth: number;
  currency: string;
  change24hPercent: number;
  change30dPercent: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function changeColor(pct: number): string {
  return pct >= 0 ? '#10b981' : '#ef4444';
}

function changeArrow(pct: number): string {
  return pct >= 0 ? '↑' : '↓';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NetWorthCard({
  netWorth,
  currency,
  change24hPercent,
  change30dPercent,
}: NetWorthCardProps): React.JSX.Element {
  const a11yLabel = [
    `Patrimonio neto: ${formatCurrency(netWorth, currency)}`,
    `Cambio en 24 horas: ${formatPercent(change24hPercent)}`,
    `Cambio en 30 días: ${formatPercent(change30dPercent)}`,
  ].join('. ');

  return (
    <View
      className="mx-4 mt-2"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      {/* Net worth amount */}
      <Text
        className="text-white text-4xl font-bold tracking-tight"
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatCurrency(netWorth, currency)}
      </Text>

      {/* Change indicators */}
      <View className="flex-row items-center mt-2 gap-x-4">
        {/* 24h */}
        <View className="flex-row items-center gap-x-1">
          <Text
            style={{ color: changeColor(change24hPercent) }}
            className="text-sm font-semibold"
          >
            {changeArrow(change24hPercent)} {formatPercent(change24hPercent)}
          </Text>
          <Text className="text-slate-500 text-xs">(24h)</Text>
        </View>

        <Text className="text-slate-700 text-xs">·</Text>

        {/* 30d */}
        <View className="flex-row items-center gap-x-1">
          <Text
            style={{ color: changeColor(change30dPercent) }}
            className="text-sm font-semibold"
          >
            {changeArrow(change30dPercent)} {formatPercent(change30dPercent)}
          </Text>
          <Text className="text-slate-500 text-xs">(30d)</Text>
        </View>
      </View>
    </View>
  );
}
