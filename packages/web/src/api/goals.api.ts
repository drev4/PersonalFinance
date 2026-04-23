import { apiClient } from '../lib/api';
import type { Goal, CreateGoalDTO, UpdateGoalDTO } from '../types/api';

export async function getGoals(): Promise<Goal[]> {
  const response = await apiClient.get<{ data: Goal[] }>('/goals');
  return response.data.data;
}

export async function getGoal(id: string): Promise<Goal> {
  const response = await apiClient.get<{ data: Goal }>(`/goals/${id}`);
  return response.data.data;
}

export async function createGoal(data: CreateGoalDTO): Promise<Goal> {
  const response = await apiClient.post<{ data: Goal }>('/goals', data);
  return response.data.data;
}

export async function updateGoal(id: string, data: UpdateGoalDTO): Promise<Goal> {
  const response = await apiClient.patch<{ data: Goal }>(`/goals/${id}`, data);
  return response.data.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await apiClient.delete(`/goals/${id}`);
}
