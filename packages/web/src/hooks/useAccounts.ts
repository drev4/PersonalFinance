import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  adjustBalance,
  archiveAccount,
  getNetWorth,
} from '../api/accounts.api';
import { dashboardKeys } from './useDashboard';
import type {
  Account,
  CreateAccountDTO,
  UpdateAccountDTO,
  NetWorthData,
  Transaction,
} from '../types/api';

const STALE_TIME = 1000 * 60 * 5;

export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
  netWorth: () => [...accountKeys.all, 'net-worth'] as const,
};

export function useAccounts(): UseQueryResult<Account[]> {
  return useQuery({
    queryKey: accountKeys.lists(),
    queryFn: getAccounts,
    staleTime: STALE_TIME,
  });
}

export function useAccount(id: string): UseQueryResult<Account> {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => getAccount(id),
    staleTime: STALE_TIME,
    enabled: Boolean(id),
  });
}

export function useCreateAccount(): UseMutationResult<Account, Error, CreateAccountDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useUpdateAccount(): UseMutationResult<
  Account,
  Error,
  { id: string; data: UpdateAccountDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAccount(id, data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.setQueryData(accountKeys.detail(updated._id), updated);
    },
  });
}

export function useAdjustBalance(): UseMutationResult<
  { account: Account; transaction: Transaction },
  Error,
  { id: string; newBalance: number; note?: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newBalance, note }) => adjustBalance(id, newBalance, note),
    onSuccess: ({ account }) => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.setQueryData(accountKeys.detail(account._id), account);
    },
  });
}

export function useArchiveAccount(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useNetWorth(): UseQueryResult<NetWorthData> {
  return useQuery({
    queryKey: accountKeys.netWorth(),
    queryFn: getNetWorth,
    staleTime: STALE_TIME,
  });
}
