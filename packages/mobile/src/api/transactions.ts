import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  getTransactions,
  getCategories,
  getAccounts,
  createTransaction,
  createTransfer,
  updateTransaction,
  deleteTransaction,
  type Transaction,
  type Category,
  type Account,
  type TransactionFilters,
  type PaginatedResponse,
  type CreateTransactionDTO,
  type CreateTransferDTO,
  type UpdateTransactionDTO,
} from './transactions.api';

const STALE_TIME = 1000 * 60 * 5;

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) => [...transactionKeys.lists(), filters] as const,
};

export const useTransactions = (filters: TransactionFilters) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => getTransactions(filters),
    staleTime: STALE_TIME,
    enabled: !!accessToken,
  });
};

export const useCategories = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: STALE_TIME,
    enabled: !!accessToken,
  });
};

export const useAccounts = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
    staleTime: STALE_TIME,
    enabled: !!accessToken,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionDTO }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export type {
  Transaction,
  Category,
  Account,
  TransactionFilters,
  PaginatedResponse,
  CreateTransactionDTO,
  UpdateTransactionDTO,
};
