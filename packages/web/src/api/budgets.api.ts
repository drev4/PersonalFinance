import { apiClient } from '../lib/api';
import type {
  Budget,
  BudgetProgress,
  BudgetAlert,
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from '../types/api';

export async function getBudgets(): Promise<Budget[]> {
  const response = await apiClient.get<{ data: Budget[] }>('/budgets');
  return response.data.data;
}

export async function getBudget(id: string): Promise<Budget> {
  const response = await apiClient.get<{ data: Budget }>(`/budgets/${id}`);
  return response.data.data;
}

export async function createBudget(data: CreateBudgetDTO): Promise<Budget> {
  const response = await apiClient.post<{ data: Budget }>('/budgets', data);
  return response.data.data;
}

export async function updateBudget(id: string, data: UpdateBudgetDTO): Promise<Budget> {
  const response = await apiClient.patch<{ data: Budget }>(`/budgets/${id}`, data);
  return response.data.data;
}

export async function deleteBudget(id: string): Promise<void> {
  await apiClient.delete(`/budgets/${id}`);
}

export async function getBudgetProgress(
  id: string,
  referenceDate?: string,
): Promise<BudgetProgress> {
  const params = referenceDate ? { referenceDate } : undefined;
  const response = await apiClient.get<{ data: BudgetProgress }>(`/budgets/${id}/progress`, {
    params,
  });
  return response.data.data;
}

export async function getBudgetAlerts(): Promise<BudgetAlert[]> {
  const response = await apiClient.get<{ data: BudgetAlert[] }>('/budgets/alerts');
  return response.data.data;
}
