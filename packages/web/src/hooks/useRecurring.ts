import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} from '../api/recurring.api';
import type { RecurringTransaction, CreateRecurringDTO, UpdateRecurringDTO } from '../api/recurring.api';

const STALE_TIME = 1000 * 60 * 2;

export const recurringKeys = {
  all: ['recurring'] as const,
  lists: () => [...recurringKeys.all, 'list'] as const,
};

export function useCreateRecurring(): UseMutationResult<RecurringTransaction, Error, CreateRecurringDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecurring,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useRecurring(): UseQueryResult<RecurringTransaction[]> {
  return useQuery({
    queryKey: recurringKeys.lists(),
    queryFn: getRecurring,
    staleTime: STALE_TIME,
  });
}

export function useUpdateRecurring(): UseMutationResult<
  RecurringTransaction,
  Error,
  { id: string; data: UpdateRecurringDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateRecurring(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useDeleteRecurring(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecurring,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}
