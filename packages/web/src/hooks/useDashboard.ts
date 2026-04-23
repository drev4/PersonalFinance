import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  getDashboardNetWorth,
  getNetWorthHistory,
  getDashboardCashflow,
  getDashboardSpendingByCategory,
  getUpcomingRecurring,
} from '../api/dashboard.api';
import type {
  NetWorthSummary,
  NetWorthPoint,
  NetWorthHistoryPeriod,
  CashflowMonth,
  CategorySpendingItem,
  Transaction,
} from '../types/api';

const STALE_TIME = 1000 * 60 * 5;

export const dashboardKeys = {
  all: ['dashboard'] as const,
  netWorth: () => [...dashboardKeys.all, 'net-worth'] as const,
  netWorthHistory: (period: NetWorthHistoryPeriod) =>
    [...dashboardKeys.all, 'net-worth-history', period] as const,
  cashflow: (months: number) => [...dashboardKeys.all, 'cashflow', months] as const,
  spendingByCategory: (from: string, to: string) =>
    [...dashboardKeys.all, 'spending', from, to] as const,
  upcomingRecurring: (days: number) =>
    [...dashboardKeys.all, 'upcoming-recurring', days] as const,
};

export function useNetWorthSummary(): UseQueryResult<NetWorthSummary> {
  return useQuery({
    queryKey: dashboardKeys.netWorth(),
    queryFn: getDashboardNetWorth,
    staleTime: STALE_TIME,
  });
}

export function useNetWorthHistory(
  period: NetWorthHistoryPeriod,
): UseQueryResult<NetWorthPoint[]> {
  return useQuery({
    queryKey: dashboardKeys.netWorthHistory(period),
    queryFn: () => getNetWorthHistory(period),
    staleTime: STALE_TIME,
  });
}

export function useDashboardCashflow(months: number): UseQueryResult<CashflowMonth[]> {
  return useQuery({
    queryKey: dashboardKeys.cashflow(months),
    queryFn: () => getDashboardCashflow(months),
    staleTime: STALE_TIME,
  });
}

export function useDashboardSpendingByCategory(
  from: string,
  to: string,
): UseQueryResult<CategorySpendingItem[]> {
  return useQuery({
    queryKey: dashboardKeys.spendingByCategory(from, to),
    queryFn: () => getDashboardSpendingByCategory(from, to),
    staleTime: STALE_TIME,
    enabled: Boolean(from) && Boolean(to),
  });
}

export function useUpcomingRecurring(days = 30): UseQueryResult<Transaction[]> {
  return useQuery({
    queryKey: dashboardKeys.upcomingRecurring(days),
    queryFn: () => getUpcomingRecurring(days),
    staleTime: STALE_TIME,
  });
}
