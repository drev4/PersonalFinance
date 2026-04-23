import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getBudgets,
  getBudgetProgress,
  getBudgetAlerts,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../api/budgets.api';
import type {
  Budget,
  BudgetProgress,
  BudgetAlert,
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from '../types/api';

const STALE_TIME = 1000 * 60 * 5;

export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  detail: (id: string) => [...budgetKeys.all, 'detail', id] as const,
  progress: (id: string) => [...budgetKeys.all, 'progress', id] as const,
  alerts: () => [...budgetKeys.all, 'alerts'] as const,
};

export function useBudgets(): UseQueryResult<Budget[]> {
  return useQuery({
    queryKey: budgetKeys.lists(),
    queryFn: getBudgets,
    staleTime: STALE_TIME,
  });
}

export function useBudgetProgress(id: string): UseQueryResult<BudgetProgress> {
  return useQuery({
    queryKey: budgetKeys.progress(id),
    queryFn: () => getBudgetProgress(id),
    staleTime: STALE_TIME,
    enabled: Boolean(id),
  });
}

export function useBudgetAlerts(): UseQueryResult<BudgetAlert[]> {
  return useQuery({
    queryKey: budgetKeys.alerts(),
    queryFn: getBudgetAlerts,
    staleTime: STALE_TIME,
  });
}

export function useCreateBudget(): UseMutationResult<Budget, Error, CreateBudgetDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useUpdateBudget(): UseMutationResult<
  Budget,
  Error,
  { id: string; data: UpdateBudgetDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateBudget(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useDeleteBudget(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}
