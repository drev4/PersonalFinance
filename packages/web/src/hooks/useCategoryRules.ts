import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getCategoryRules,
  createCategoryRule,
  updateCategoryRule,
  deleteCategoryRule,
} from '../api/categoryRules.api';
import type { CategoryRule, CreateCategoryRuleDTO, UpdateCategoryRuleDTO } from '../api/categoryRules.api';

const STALE_TIME = 1000 * 60 * 5;

export const categoryRuleKeys = {
  all: ['category-rules'] as const,
  lists: () => [...categoryRuleKeys.all, 'list'] as const,
};

export function useCategoryRules(): UseQueryResult<CategoryRule[]> {
  return useQuery({
    queryKey: categoryRuleKeys.lists(),
    queryFn: getCategoryRules,
    staleTime: STALE_TIME,
  });
}

export function useCreateCategoryRule(): UseMutationResult<CategoryRule, Error, CreateCategoryRuleDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategoryRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryRuleKeys.all });
    },
  });
}

export function useUpdateCategoryRule(): UseMutationResult<
  CategoryRule,
  Error,
  { id: string; data: UpdateCategoryRuleDTO }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateCategoryRule(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryRuleKeys.all });
    },
  });
}

export function useDeleteCategoryRule(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategoryRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryRuleKeys.all });
    },
  });
}
