import { apiClient } from '../lib/api';
import type {
  Transaction,
  PaginatedResponse,
  TransactionFilters,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  CreateTransferDTO,
  CategorySpending,
  CashflowData,
} from '../types/api';

export async function getTransactions(
  filters: TransactionFilters,
): Promise<PaginatedResponse<Transaction>> {
  const { tags, ...rest } = filters;
  const params: Record<string, unknown> = { ...rest };
  if (tags && tags.length > 0) params['tags'] = tags.join(',');
  const response = await apiClient.get<{ data: PaginatedResponse<Transaction> }>('/transactions', {
    params,
  });
  return response.data.data;
}

export async function getTransactionTags(): Promise<string[]> {
  const response = await apiClient.get<{ data: string[] }>('/transactions/tags');
  return response.data.data;
}

export async function getTransaction(id: string): Promise<Transaction> {
  const response = await apiClient.get<{ data: Transaction }>(`/transactions/${id}`);
  return response.data.data;
}

export async function createTransaction(data: CreateTransactionDTO): Promise<Transaction> {
  const response = await apiClient.post<{ data: Transaction }>('/transactions', data);
  return response.data.data;
}

export async function createTransfer(
  data: CreateTransferDTO,
): Promise<{ from: Transaction; to: Transaction }> {
  const response = await apiClient.post<{ data: { from: Transaction; to: Transaction } }>(
    '/transactions/transfer',
    data,
  );
  return response.data.data;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionDTO,
): Promise<Transaction> {
  const response = await apiClient.patch<{ data: Transaction }>(`/transactions/${id}`, data);
  return response.data.data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete(`/transactions/${id}`);
}

export async function getSpendingByCategory(
  from: string,
  to: string,
): Promise<CategorySpending[]> {
  const response = await apiClient.get<{ data: CategorySpending[] }>(
    '/transactions/spending-by-category',
    { params: { from, to } },
  );
  return response.data.data;
}

export async function getCashflow(months: number): Promise<CashflowData[]> {
  const response = await apiClient.get<{ data: CashflowData[] }>('/transactions/cashflow', {
    params: { months },
  });
  return response.data.data;
}
