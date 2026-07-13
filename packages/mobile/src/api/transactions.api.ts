import client from './client';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';

export interface Transaction {
  _id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  tags: string[];
  transferToAccountId?: string;
  source: string;
  externalId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  parentId?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Account {
  _id: string;
  userId: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: number;
  initialBalance: number;
  institution?: string;
  notes?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  includedInNetWorth: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    total: number;
    totalPages: number;
  };
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransactionDTO {
  accountId: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  tags?: string[];
  notes?: string;
}

export interface CreateTransferDTO {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
}

export interface UpdateTransactionDTO {
  type?: 'income' | 'expense';
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string;
  notes?: string;
}

export async function getTransactions(
  filters: TransactionFilters,
): Promise<PaginatedResponse<Transaction>> {
  const response = await client.get<{ data: PaginatedResponse<Transaction> }>(
    '/transactions',
    { params: filters },
  );
  return response.data.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await client.get<{ data: Category[] }>('/categories');
  return response.data.data;
}

export async function getAccounts(): Promise<Account[]> {
  const response = await client.get<{ data: Account[] }>('/accounts');
  return response.data.data;
}

export async function createTransaction(
  data: CreateTransactionDTO,
): Promise<Transaction> {
  const response = await client.post<{ data: Transaction }>('/transactions', data);
  return response.data.data;
}

export async function createTransfer(
  data: CreateTransferDTO,
): Promise<{ from: Transaction; to: Transaction }> {
  const response = await client.post<{ data: { from: Transaction; to: Transaction } }>(
    '/transactions/transfer',
    data,
  );
  return response.data.data;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionDTO,
): Promise<Transaction> {
  const response = await client.patch<{ data: Transaction }>(`/transactions/${id}`, data);
  return response.data.data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await client.delete(`/transactions/${id}`);
}
