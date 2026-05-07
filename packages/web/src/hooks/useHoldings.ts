import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  addDividend,
  getHoldings,
  getHoldingIncome,
  getPortfolioSummary,
  createHolding,
  updateHolding,
  deleteHolding,
  searchTicker,
  importFromCsv,
} from '../api/holdings.api';
import type {
  AddDividendDTO,
  Holding,
  HoldingIncome,
  HoldingWithValue,
  IncomeHistory,
  ImportResult,
  PortfolioSummary,
  TickerSearchResult,
  CreateHoldingDTO,
  UpdateHoldingDTO,
} from '../types/api';
import { accountKeys } from './useAccounts';
import { dashboardKeys } from './useDashboard';

// Precios cambian con más frecuencia que otros datos financieros
const STALE_TIME = 1000 * 60 * 2; // 2 minutos

export const holdingKeys = {
  all: ['holdings'] as const,
  lists: () => [...holdingKeys.all, 'list'] as const,
  detail: (id: string) => [...holdingKeys.all, 'detail', id] as const,
  income: (id: string) => [...holdingKeys.all, 'income', id] as const,
  portfolio: () => ['portfolio'] as const,
  ticker: (query: string, type: string) => ['ticker', query, type] as const,
};

export function useHoldings(): UseQueryResult<HoldingWithValue[]> {
  return useQuery({
    queryKey: holdingKeys.lists(),
    queryFn: getHoldings,
    staleTime: STALE_TIME,
  });
}

export function usePortfolioSummary(): UseQueryResult<PortfolioSummary> {
  return useQuery({
    queryKey: holdingKeys.portfolio(),
    queryFn: getPortfolioSummary,
    staleTime: STALE_TIME,
  });
}

export function useSearchTicker(
  query: string,
  type: 'crypto' | 'stock',
): UseQueryResult<TickerSearchResult[]> {
  return useQuery({
    queryKey: holdingKeys.ticker(query, type),
    queryFn: () => searchTicker(query, type),
    staleTime: 1000 * 60 * 10, // ticker data es más estable
    enabled: query.length >= 2,
  });
}

export function useCreateHolding(): UseMutationResult<Holding, Error, CreateHoldingDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHolding,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      void queryClient.invalidateQueries({ queryKey: holdingKeys.portfolio() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateHolding(): UseMutationResult<
  Holding,
  Error,
  { id: string; data: UpdateHoldingDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateHolding(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      void queryClient.invalidateQueries({ queryKey: holdingKeys.portfolio() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useDeleteHolding(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHolding,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      void queryClient.invalidateQueries({ queryKey: holdingKeys.portfolio() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useHoldingIncome(holdingId: string, enabled = true): UseQueryResult<IncomeHistory> {
  return useQuery({
    queryKey: holdingKeys.income(holdingId),
    queryFn: () => getHoldingIncome(holdingId),
    enabled: enabled && holdingId.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddDividend(): UseMutationResult<
  HoldingIncome,
  Error,
  { holdingId: string; data: AddDividendDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ holdingId, data }) => addDividend(holdingId, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: holdingKeys.income(variables.holdingId),
      });
      void queryClient.invalidateQueries({ queryKey: holdingKeys.portfolio() });
    },
  });
}

export function useImportCsv(): UseMutationResult<
  ImportResult,
  Error,
  { accountId: string; csvContent: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, csvContent }) => importFromCsv(accountId, csvContent),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      void queryClient.invalidateQueries({ queryKey: holdingKeys.portfolio() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
