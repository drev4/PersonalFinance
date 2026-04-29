import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export interface Transaction {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  transferToAccountId?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  parentId?: string;
  userId?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface Account {
  _id: string;
  name: string;
  type: string;
  currentBalance: number;
  currency: string;
}

export interface CreateTransactionDTO {
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  date: string;
  description: string;
  categoryId?: string;
  toAccountId?: string;
  tags?: string[];
  notes?: string;
}

export const useCategories = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await client.get<{ data: Category[] }>('/categories');
      return response.data.data;
    },
    enabled: !!accessToken,
  });
};

export const useAccounts = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await client.get<{ data: Account[] }>('/accounts');
      return response.data.data;
    },
    enabled: !!accessToken,
  });
};

export interface TransactionFilters {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface TransactionResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export const useTransactions = (filters: TransactionFilters) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      try {
        const response = await client.get<{ data: TransactionResponse }>(
          `/transactions?${params.toString()}`,
        );
        console.log('Transactions response:', response.data);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
    },
    enabled: !!accessToken,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransactionDTO) => {
      if (data.type === 'transfer') {
        const response = await client.post<{ data: { from: Transaction; to: Transaction } }>(
          '/transactions/transfer',
          {
            fromAccountId: data.accountId,
            toAccountId: data.toAccountId,
            amount: data.amount,
            date: data.date,
            description: data.description,
          },
        );
        return response.data.data;
      }

      const response = await client.post<{ data: Transaction }>('/transactions', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
