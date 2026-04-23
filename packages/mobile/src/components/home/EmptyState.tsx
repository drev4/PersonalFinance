/**
 * EmptyState — reusable empty/error placeholder with icon, title and subtitle.
 */

import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  Icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Optional action below the subtitle */
  action?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmptyState({
  Icon,
  title,
  subtitle,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View
      className="items-center justify-center py-10 px-6"
      accessible
      accessibilityRole="text"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      <View className="w-16 h-16 rounded-full bg-slate-800 items-center justify-center mb-4">
        <Icon size={28} color="#64748b" strokeWidth={1.5} />
      </View>

      <Text className="text-slate-300 text-base font-semibold text-center mb-1">
        {title}
      </Text>

      {subtitle ? (
        <Text className="text-slate-500 text-sm text-center leading-5">
          {subtitle}
        </Text>
      ) : null}

      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
