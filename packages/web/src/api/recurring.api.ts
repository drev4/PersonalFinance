import { apiClient } from '../lib/api';
import type { Transaction } from '../types/api';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringConfig {
  frequency: RecurringFrequency;
  interval: number;
  nextDate: string;
  endDate?: string;
}

export interface RecurringTransaction extends Transaction {
  recurring: RecurringConfig;
}

export interface CreateRecurringDTO {
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  categoryId?: string;
  tags?: string[];
  frequency: RecurringFrequency;
  interval?: number;
  nextDate: string;
  endDate?: string;
}

export interface UpdateRecurringDTO {
  frequency?: RecurringFrequency;
  interval?: number;
  nextDate?: string;
  endDate?: string;
}

export async function createRecurring(data: CreateRecurringDTO): Promise<RecurringTransaction> {
  const response = await apiClient.post<{ data: RecurringTransaction }>(
    '/transactions/recurring',
    data,
  );
  return response.data.data;
}

export async function getRecurring(): Promise<RecurringTransaction[]> {
  const response = await apiClient.get<{ data: RecurringTransaction[] }>('/transactions/recurring');
  return response.data.data;
}

export async function updateRecurring(
  id: string,
  data: UpdateRecurringDTO,
): Promise<RecurringTransaction> {
  const response = await apiClient.patch<{ data: RecurringTransaction }>(
    `/transactions/recurring/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteRecurring(id: string): Promise<void> {
  await apiClient.delete(`/transactions/recurring/${id}`);
}
