import type React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '../stores/authStore';
import { useNetWorthSummary, useNetWorthHistory } from '../hooks/useDashboard';
import QuickStatsRow from '../components/dashboard/QuickStatsRow';
import NetWorthCard from '../components/dashboard/NetWorthCard';
import NetWorthChart from '../components/dashboard/NetWorthChart';
import SpendingByCategoryChart from '../components/dashboard/SpendingByCategoryChart';
import CashflowChart from '../components/dashboard/CashflowChart';
import UpcomingRecurringWidget from '../components/dashboard/UpcomingRecurringWidget';
import TopAccountsWidget from '../components/dashboard/TopAccountsWidget';
import TopHoldingsWidget from '../components/dashboard/TopHoldingsWidget';

// ─── Date header ──────────────────────────────────────────────────────────────

function formatTodayLong(): string {
  const today = new Date();
  const raw = format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  // Capitalize first letter
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage(): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  console.log(user);

  const displayName = user?.name || user?.email || 'Usuario';
  const firstName = user?.name?.split(' ')[0]?.trim() || displayName;

  // Prefetch net worth data here so NetWorthCard and NetWorthChart share the same
  // query cache — no double fetching.
  const netWorthQuery = useNetWorthSummary();
  // Default history period for the card variation calculation
  const historyQuery = useNetWorthHistory('1m');

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ─── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bienvenido, {firstName}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">{formatTodayLong()}</p>
          </div>
        </div>

        {/* ─── Quick stats ──────────────────────────────────────────────────── */}
        <QuickStatsRow />

        {/* ─── NetWorth + Spending (2 col on md+) ──────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left: net worth card + chart stacked */}
          <div className="flex flex-col gap-6">
            <NetWorthCard
              data={netWorthQuery.data}
              history={historyQuery.data}
              isLoading={netWorthQuery.isLoading}
            />
            <NetWorthChart />
          </div>

          {/* Right: spending donut */}
          <SpendingByCategoryChart />
        </div>

        {/* ─── Cashflow (full width) ────────────────────────────────────────── */}
        <CashflowChart />

        {/* ─── Upcoming + Top accounts (2 col on md+) ──────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <UpcomingRecurringWidget />
          <TopAccountsWidget />
        </div>

        {/* ─── Top holdings (full width) ────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TopHoldingsWidget />
        </div>

      </div>
    </div>
  );
}
