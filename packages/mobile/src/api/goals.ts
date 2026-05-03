import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export interface Goal {
  _id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
  isCompleted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalDTO {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateGoalDTO {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
}

export function calculateMonthlySuggestion(goal: Goal): number | null {
  if (!goal.deadline) return null;
  const now = new Date();
  const deadline = new Date(goal.deadline);
  if (deadline <= now) return null;
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return 0;
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.4375;
  const monthsLeft = (deadline.getTime() - now.getTime()) / msPerMonth;
  if (monthsLeft <= 0) return null;
  return Math.ceil(remaining / monthsLeft);
}

export const useGoals = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<Goal[]>({
    queryKey: ['goals'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: Goal[] }>('/goals');
      return (response.data.data ?? []).filter((g) => g.isActive);
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGoalDTO) => {
      const response = await client.post<{ data: Goal }>('/goals', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateGoalDTO }) => {
      const response = await client.patch<{ data: Goal }>(`/goals/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
