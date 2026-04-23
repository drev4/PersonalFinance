/**
 * Home screen — Fase 2.
 *
 * Layout (top → bottom, glance-first):
 *   1. Header: avatar + greeting
 *   2. NetWorthCard
 *   3. SparklineChart (30-day history)
 *   4. AccountsCarousel
 *   5. SpendingProgressBar
 *   6. Recent transactions (last 5)
 *
 * States:
 *   - Loading → HomeSkeleton (shimmer)
 *   - Error   → EmptyState with retry button
 *   - Empty   → graceful empty states per section
 *   - Data    → full layout
 *
 * Pull-to-refresh: RefreshControl backed by useRefreshDashboard.
 */

import { AlertCircle, Inbox, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { AccountsCarousel } from '@/components/home/AccountsCarousel';
import { EmptyState } from '@/components/home/EmptyState';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { NetWorthCard } from '@/components/home/NetWorthCard';
import { SparklineChart } from '@/components/home/SparklineChart';
import { SpendingProgressBar } from '@/components/home/SpendingProgressBar';
import { TransactionItem } from '@/components/home/TransactionItem';
import { useRefreshDashboard } from '@/hooks/useRefreshDashboard';
import { useAuthStore } from '@/stores/auth.store';

// ─── User header ──────────────────────────────────────────────────────────────

function UserHeader({ firstName }: { firstName: string }): React.JSX.Element {
  const initial = (firstName[0] ?? 'U').toUpperCase();

  return (
    <View className="flex-row items-center px-4 pt-4 pb-2">
      {/* Avatar */}
      <View
        className="w-10 h-10 rounded-full bg-sky-600 items-center justify-center mr-3"
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Avatar de ${firstName}`}
      >
        <Text className="text-white text-base font-bold">{initial}</Text>
      </View>

      {/* Greeting */}
      <View>
        <Text className="text-slate-400 text-xs">Bienvenido de nuevo</Text>
        <Text className="text-white text-base font-semibold">
          Hola, {firstName}
        </Text>
      </View>
    </View>
  );
}

// ─── Recent transactions section ──────────────────────────────────────────────

function RecentTransactions({
  transactions,
}: {
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    type: 'income' | 'expense' | 'transfer';
    category?: string;
    date: string;
  }>;
}): React.JSX.Element {
  return (
    <View className="mt-4">
      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-4 mb-1">
        Últimos movimientos
      </Text>

      {transactions.length === 0 ? (
        <EmptyState
          Icon={Inbox}
          title="Aún no hay movimientos"
          subtitle="Tus transacciones aparecerán aquí una vez que las registres."
        />
      ) : (
        <View
          className="mt-1"
          accessibilityRole="list"
          accessible
          accessibilityLabel="Últimas transacciones"
        >
          {transactions.slice(0, 5).map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <EmptyState
        Icon={AlertCircle}
        title="No pudimos cargar tus datos"
        subtitle={message}
        action={
          <Pressable
            onPress={onRetry}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Reintentar carga del panel"
            className="flex-row items-center gap-x-2 bg-sky-600 rounded-xl px-5 py-3 active:bg-sky-700"
          >
            <RefreshCw size={16} color="#ffffff" strokeWidth={2} />
            <Text className="text-white text-sm font-semibold">Reintentar</Text>
          </Pressable>
        }
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error, refetch } = useDashboardSummary();
  const { onRefresh, isRefreshing } = useRefreshDashboard();

  const firstName = user?.firstName ?? 'Usuario';

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <UserHeader firstName={firstName} />
          <HomeSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Error state (no cached data) ───────────────────────────────────────────
  if (error && !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
        <UserHeader firstName={firstName} />
        <ErrorState message={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  // ── Data (or empty) state ──────────────────────────────────────────────────
  const netWorth = data?.netWorth ?? 0;
  const netWorthCurrency = data?.netWorthCurrency ?? 'EUR';
  const change24h = data?.change24hPercent ?? 0;
  const change30d = data?.change30dPercent ?? 0;
  const history = data?.netWorthHistory ?? [];
  const accounts = data?.accounts ?? [];
  const recentTransactions = data?.recentTransactions ?? [];
  const monthSpending = data?.monthSpending ?? 0;
  const monthBudget = data?.monthBudget ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
            colors={['#0ea5e9']}
            progressBackgroundColor="#1e293b"
            accessibilityLabel="Actualizando panel financiero"
          />
        }
      >
        {/* 1. Header */}
        <UserHeader firstName={firstName} />

        {/* 2. Net Worth Card */}
        <NetWorthCard
          netWorth={netWorth}
          currency={netWorthCurrency}
          change24hPercent={change24h}
          change30dPercent={change30d}
        />

        {/* 3. Sparkline */}
        {history.length >= 2 ? (
          <SparklineChart data={history} height={80} />
        ) : null}

        {/* 4. Accounts Carousel */}
        {accounts.length > 0 ? (
          <AccountsCarousel accounts={accounts} />
        ) : (
          <View className="mt-4">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-4 mb-2">
              Cuentas
            </Text>
            <EmptyState
              Icon={Inbox}
              title="Sin cuentas vinculadas"
              subtitle="Agrega una cuenta para ver tu saldo aquí."
            />
          </View>
        )}

        {/* 5. Monthly spending progress */}
        {monthBudget > 0 ? (
          <SpendingProgressBar
            spent={monthSpending}
            budget={monthBudget}
            currency={netWorthCurrency}
          />
        ) : null}

        {/* 6. Recent transactions */}
        <RecentTransactions transactions={recentTransactions} />

        {/* Soft error banner when there's cached data but a fresh error */}
        {error && data ? (
          <View className="mx-4 mt-4 rounded-xl bg-amber-900/50 px-4 py-3 flex-row items-center gap-x-2">
            <AlertCircle size={16} color="#f59e0b" strokeWidth={2} />
            <Text className="text-amber-300 text-xs flex-1" numberOfLines={2}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
