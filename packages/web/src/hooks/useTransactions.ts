import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getTransactions,
  createTransaction,
  createTransfer,
  updateTransaction,
  deleteTransaction,
  getSpendingByCategory,
  getCashflow,
} from '../api/transactions.api';
import type {
  Transaction,
  PaginatedResponse,
  TransactionFilters,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  CreateTransferDTO,
  CategorySpending,
  CashflowData,
} from '../types/api';
import { accountKeys } from './useAccounts';

const STALE_TIME = 1000 * 60 * 5;

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.lists(), filters] as const,
  spendingByCategory: (from: string, to: string) =>
    [...transactionKeys.all, 'spending', from, to] as const,
  cashflow: (months: number) => [...transactionKeys.all, 'cashflow', months] as const,
};

export function useTransactions(
  filters: TransactionFilters,
): UseQueryResult<PaginatedResponse<Transaction>> {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => getTransactions(filters),
    staleTime: STALE_TIME,
  });
}

export function useCreateTransaction(): UseMutationResult<
  Transaction,
  Error,
  CreateTransactionDTO
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useCreateTransfer(): UseMutationResult<
  { from: Transaction; to: Transaction },
  Error,
  CreateTransferDTO
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateTransaction(): UseMutationResult<
  Transaction,
  Error,
  { id: string; data: UpdateTransactionDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateTransaction(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useDeleteTransaction(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useSpendingByCategory(
  from: string,
  to: string,
): UseQueryResult<CategorySpending[]> {
  return useQuery({
    queryKey: transactionKeys.spendingByCategory(from, to),
    queryFn: () => getSpendingByCategory(from, to),
    staleTime: STALE_TIME,
    enabled: Boolean(from) && Boolean(to),
  });
}

export function useCashflow(months: number): UseQueryResult<CashflowData[]> {
  return useQuery({
    queryKey: transactionKeys.cashflow(months),
    queryFn: () => getCashflow(months),
    staleTime: STALE_TIME,
  });
}
