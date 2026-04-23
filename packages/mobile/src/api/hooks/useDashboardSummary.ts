/**
 * useDashboardSummary — fetches GET /dashboard/summary.
 *
 * - staleTime: 30 s  (fresh data, low lag on re-focus)
 * - retry: 2 with exponential back-off (1 s → 2 s)
 * - Returns typed data + friendly error message
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiClient, ApiError } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
  color?: string;
}

export interface DashboardTransaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  category?: string;
  date: string;
}

export interface DashboardHolding {
  id: string;
  symbol: string;
  name: string;
  currentValue: number;
  currency: string;
  gainLossPercent: number;
}

export interface NetWorthDataPoint {
  date: string;
  value: number;
}

export interface DashboardSummary {
  netWorth: number;
  netWorthCurrency: string;
  change24hPercent: number;
  change30dPercent: number;
  netWorthHistory: NetWorthDataPoint[];
  accounts: DashboardAccount[];
  recentTransactions: DashboardTransaction[];
  topHoldings: DashboardHolding[];
  todaySpending: number;
  monthSpending: number;
  monthBudget: number;
  monthBudgetUsage: number; // 0..1 ratio
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const DASHBOARD_SUMMARY_KEY = ['dashboard', 'summary'] as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseDashboardSummaryResult {
  data: DashboardSummary | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'El panel aún no tiene datos disponibles.';
    if (err.status >= 500) return 'Error del servidor. Intenta de nuevo.';
    if (err.status === 401) return 'Sesión expirada. Por favor, inicia sesión.';
    return err.message;
  }
  if (err instanceof Error) {
    if (err.message.includes('Network request failed') || err.message.includes('fetch'))
      return 'Sin conexión. Mostrando datos en caché.';
    return err.message;
  }
  return 'Error desconocido al cargar el panel.';
}

export function useDashboardSummary(): UseDashboardSummaryResult {
  const result: UseQueryResult<DashboardSummary, Error> = useQuery({
    queryKey: DASHBOARD_SUMMARY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  return {
    data: result.data,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error ? friendlyError(result.error) : null,
    refetch: () => { void result.refetch(); },
  };
}
