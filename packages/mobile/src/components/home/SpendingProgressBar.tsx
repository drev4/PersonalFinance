/**
 * SpendingProgressBar — monthly spending vs. budget progress bar.
 *
 * Color logic:
 *   < 80%  → emerald (green)
 *   80-100% → amber (yellow/warning)
 *   > 100% → red (over-budget)
 */

import React from 'react';
import { Text, View } from 'react-native';

import { formatCurrency } from '@/lib/formatters';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpendingProgressBarProps {
  spent: number;
  budget: number;
  currency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function barColor(ratio: number): string {
  if (ratio < 0.8) return '#10b981'; // emerald-500
  if (ratio <= 1.0) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SpendingProgressBar({
  spent,
  budget,
  currency,
}: SpendingProgressBarProps): React.JSX.Element {
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const overspent = budget > 0 && spent > budget;
  const fillColor = barColor(budget > 0 ? spent / budget : 0);

  const a11yLabel = `Gasto mensual: ${formatCurrency(spent, currency)} de ${formatCurrency(budget, currency)}${overspent ? ', presupuesto superado' : ''}`;

  return (
    <View
      className="mx-4 mt-4"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={a11yLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
    >
      {/* Labels row */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-slate-400 text-xs font-medium">
          Gasto este mes
        </Text>
        <Text
          className="text-xs font-semibold"
          style={{ color: overspent ? '#ef4444' : '#e2e8f0' }}
        >
          {formatCurrency(spent, currency)}{' '}
          <Text className="text-slate-500 font-normal">
            / {formatCurrency(budget, currency)}
          </Text>
        </Text>
      </View>

      {/* Track */}
      <View className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${ratio * 100}%`, backgroundColor: fillColor }}
        />
      </View>

      {/* Over-budget warning */}
      {overspent ? (
        <Text className="text-red-400 text-xs mt-1">
          Presupuesto superado
        </Text>
      ) : null}
    </View>
  );
}
