import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../api/goals.api';
import type { Goal, CreateGoalDTO, UpdateGoalDTO } from '../types/api';

const STALE_TIME = 1000 * 60 * 5;

export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  detail: (id: string) => [...goalKeys.all, 'detail', id] as const,
};

export function useGoals(): UseQueryResult<Goal[]> {
  return useQuery({
    queryKey: goalKeys.lists(),
    queryFn: getGoals,
    staleTime: STALE_TIME,
  });
}

export function useCreateGoal(): UseMutationResult<Goal, Error, CreateGoalDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useUpdateGoal(): UseMutationResult<
  Goal,
  Error,
  { id: string; data: UpdateGoalDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateGoal(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useDeleteGoal(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}
