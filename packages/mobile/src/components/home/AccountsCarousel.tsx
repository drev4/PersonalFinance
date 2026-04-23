/**
 * AccountsCarousel — horizontal FlatList of top-5 account cards.
 *
 * Each card shows account name, balance and currency.
 * Tapping a card navigates to /account/[id] (Fase 5 deep link).
 */

import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  Text,
  View,
} from 'react-native';

import type { DashboardAccount } from '@/api/hooks/useDashboardSummary';
import { formatCurrency } from '@/lib/formatters';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AccountsCarouselProps {
  accounts: DashboardAccount[];
}

// ─── Account card ─────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: DashboardAccount;
  onPress: (id: string) => void;
}

function AccountCard({ account, onPress }: AccountCardProps): React.JSX.Element {
  const accentColor = account.color ?? '#0ea5e9';

  return (
    <Pressable
      onPress={() => { onPress(account.id); }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, saldo ${formatCurrency(account.balance, account.currency)}`}
      accessibilityHint="Abre el detalle de la cuenta"
      className="active:opacity-75"
      style={{ marginRight: 12 }}
    >
      <View
        className="rounded-2xl p-4 items-center justify-center"
        style={{
          width: 140,
          backgroundColor: '#1e293b',
          // iOS shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          // Android shadow
          elevation: 4,
          borderLeftWidth: 3,
          borderLeftColor: accentColor,
        }}
      >
        <Text
          className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wider"
          numberOfLines={1}
        >
          {account.type}
        </Text>
        <Text
          className="text-white text-sm font-semibold text-center mb-2"
          numberOfLines={2}
        >
          {account.name}
        </Text>
        <Text
          className="text-white text-base font-bold text-center"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(account.balance, account.currency)}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

export function AccountsCarousel({ accounts }: AccountsCarouselProps): React.JSX.Element {
  const router = useRouter();

  const handlePress = useCallback(
    (id: string) => {
      // Fase 5: deep link to account detail — route not yet registered
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (router.push as (href: string) => void)(`/account/${id}`);
    },
    [router],
  );

  const renderItem: ListRenderItem<DashboardAccount> = useCallback(
    ({ item }) => <AccountCard account={item} onPress={handlePress} />,
    [handlePress],
  );

  const keyExtractor = useCallback((item: DashboardAccount) => item.id, []);

  return (
    <View className="mt-4">
      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-4 mb-3">
        Cuentas
      </Text>
      <FlatList
        data={accounts.slice(0, 5)}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
        accessibilityRole="list"
        accessibilityLabel="Cuentas vinculadas"
      />
    </View>
  );
}
