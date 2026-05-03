import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit_card'
  | 'real_estate'
  | 'vehicle'
  | 'loan'
  | 'mortgage'
  | 'crypto'
  | 'investment'
  | 'other';

export interface Account {
  _id: string;
  userId: string;
  name: string;
  type: AccountType;
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

export interface CreateAccountDTO {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  institution?: string;
  notes?: string;
  color?: string;
  includedInNetWorth?: boolean;
}

export interface UpdateAccountDTO {
  name?: string;
  type?: AccountType;
  currency?: string;
  institution?: string;
  notes?: string;
  color?: string;
  includedInNetWorth?: boolean;
}

export const useAccounts = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<Account[]>({
    queryKey: ['accounts'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: Account[] }>('/accounts');
      return (response.data.data ?? []).filter((a) => a.isActive);
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAccountDTO) => {
      const response = await client.post<{ data: Account }>('/accounts', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAccountDTO }) => {
      const response = await client.patch<{ data: Account }>(`/accounts/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useAdjustBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newBalance, note }: { id: string; newBalance: number; note?: string }) => {
      const response = await client.patch<{ data: Account }>(`/accounts/${id}/balance`, {
        newBalance,
        note,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useArchiveAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
