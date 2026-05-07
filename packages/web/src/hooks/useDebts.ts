import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { getDebts, createDebt, updateDebt, payDebt, deleteDebt } from '../api/debts.api';
import type { Debt, CreateDebtDTO, UpdateDebtDTO } from '../types/api';

const STALE_TIME = 1000 * 60 * 5;

export const debtKeys = {
  all: ['debts'] as const,
  lists: () => [...debtKeys.all, 'list'] as const,
  detail: (id: string) => [...debtKeys.all, 'detail', id] as const,
};

export function useDebts(): UseQueryResult<Debt[]> {
  return useQuery({
    queryKey: debtKeys.lists(),
    queryFn: getDebts,
    staleTime: STALE_TIME,
  });
}

export function useCreateDebt(): UseMutationResult<Debt, Error, CreateDebtDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDebt,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function useUpdateDebt(): UseMutationResult<
  Debt,
  Error,
  { id: string; data: UpdateDebtDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDebt(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function usePayDebt(): UseMutationResult<Debt, Error, { id: string; amount: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }) => payDebt(id, amount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function useDeleteDebt(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDebt,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}
