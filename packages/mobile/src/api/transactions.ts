import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export interface Transaction {
  _id: string;
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
  _id: string;
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
  exchangeRate?: number;
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
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface TransactionResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type InfiniteTransactionFilters = Omit<TransactionFilters, 'page' | 'limit'>;

const PAGE_SIZE = 30;

function buildTransactionParams(
  filters: InfiniteTransactionFilters,
  page: number,
): URLSearchParams {
  const { tags, ...rest } = filters;
  const params = new URLSearchParams();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.append(key, String(value));
  });
  if (tags && tags.length > 0) params.append('tags', tags.join(','));
  params.append('page', String(page));
  params.append('limit', String(PAGE_SIZE));
  return params;
}

export const useInfiniteTransactions = (filters: InfiniteTransactionFilters) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useInfiniteQuery({
    queryKey: ['transactions', 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      const params = buildTransactionParams(filters, pageParam as number);
      const response = await client.get<{ data: TransactionResponse }>(
        `/transactions?${params.toString()}`,
      );
      return response.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: !!accessToken,
  });
};

export const useTransactionTags = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<string[]>({
    queryKey: ['transactions', 'tags'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: string[] }>('/transactions/tags');
      return response.data.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useTransactions = (filters: TransactionFilters) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const { tags, ...rest } = filters;
      const params = new URLSearchParams();
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      if (tags && tags.length > 0) {
        params.append('tags', tags.join(','));
      }

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

export interface UpdateTransactionDTO {
  amount?: number;
  date?: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  notes?: string;
}

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTransactionDTO }) => {
      const response = await client.patch<{ data: Transaction }>(`/transactions/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
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
            exchangeRate: data.exchangeRate,
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
