import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export interface BudgetItem {
  categoryId: string;
  amount: number;
}

export interface Budget {
  _id: string;
  userId: string;
  name: string;
  period: 'monthly' | 'yearly';
  startDate: string;
  items: BudgetItem[];
  rollover: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItemProgress {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface BudgetProgress {
  budgetId: string;
  name: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  items: BudgetItemProgress[];
}

export interface CreateBudgetDTO {
  name: string;
  period: 'monthly' | 'yearly';
  startDate: string;
  items: BudgetItem[];
  rollover?: boolean;
}

export interface UpdateBudgetDTO {
  name?: string;
  period?: 'monthly' | 'yearly';
  startDate?: string;
  items?: BudgetItem[];
  rollover?: boolean;
}

export const useBudgets = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<Budget[]>({
    queryKey: ['budgets'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: Budget[] }>('/budgets');
      return (response.data.data ?? []).filter((b) => b.isActive);
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};

export const useBudgetProgress = (id: string) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<BudgetProgress>({
    queryKey: ['budgets', id, 'progress'],
    enabled: !!accessToken && !!id,
    queryFn: async () => {
      const response = await client.get<{ data: BudgetProgress }>(`/budgets/${id}/progress`);
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBudgetDTO) => {
      const response = await client.post<{ data: Budget }>('/budgets', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBudgetDTO }) => {
      const response = await client.patch<{ data: Budget }>(`/budgets/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
