import { apiClient } from '../lib/api';
import type { Debt, CreateDebtDTO, UpdateDebtDTO } from '../types/api';

export async function getDebts(): Promise<Debt[]> {
  const response = await apiClient.get<{ data: Debt[] }>('/debts');
  return response.data.data;
}

export async function getDebt(id: string): Promise<Debt> {
  const response = await apiClient.get<{ data: Debt }>(`/debts/${id}`);
  return response.data.data;
}

export async function createDebt(data: CreateDebtDTO): Promise<Debt> {
  const response = await apiClient.post<{ data: Debt }>('/debts', data);
  return response.data.data;
}

export async function updateDebt(id: string, data: UpdateDebtDTO): Promise<Debt> {
  const response = await apiClient.patch<{ data: Debt }>(`/debts/${id}`, data);
  return response.data.data;
}

export async function payDebt(id: string, amount: number): Promise<Debt> {
  const response = await apiClient.post<{ data: Debt }>(`/debts/${id}/payment`, { amount });
  return response.data.data;
}

export async function deleteDebt(id: string): Promise<void> {
  await apiClient.delete(`/debts/${id}`);
}
