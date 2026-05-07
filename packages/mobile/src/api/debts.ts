import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export type DebtType =
  | 'credit_card'
  | 'personal_loan'
  | 'mortgage'
  | 'student_loan'
  | 'car_loan'
  | 'other';

export interface DebtInfo {
  paidAmount: number;
  percentPaid: number;
  monthsToPayoff: number | null;
  totalInterestEstimate: number | null;
  monthlyInterestCharge: number | null;
}

export interface Debt {
  _id: string;
  userId: string;
  name: string;
  type: DebtType;
  currency: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  nextPaymentDate?: string;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
  notes?: string;
  isPaidOff: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  info?: DebtInfo;
}

export interface CreateDebtDTO {
  name: string;
  type: DebtType;
  currency: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  nextPaymentDate?: string;
  color?: string;
  notes?: string;
}

export interface UpdateDebtDTO {
  name?: string;
  type?: DebtType;
  currency?: string;
  originalAmount?: number;
  currentBalance?: number;
  interestRate?: number;
  minimumPayment?: number;
  nextPaymentDate?: string;
  color?: string;
  notes?: string;
}

export const TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Tarjeta de crédito',
  personal_loan: 'Préstamo personal',
  mortgage: 'Hipoteca',
  student_loan: 'Préstamo estudiantil',
  car_loan: 'Préstamo coche',
  other: 'Otro',
};

export const useDebts = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<Debt[]>({
    queryKey: ['debts'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: Debt[] }>('/debts');
      return (response.data.data ?? []).filter((d) => d.isActive);
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};

export const useCreateDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDebtDTO) => {
      const response = await client.post<{ data: Debt }>('/debts', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
};

export const useUpdateDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDebtDTO }) => {
      const response = await client.patch<{ data: Debt }>(`/debts/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
};

export const usePayDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const response = await client.post<{ data: Debt }>(`/debts/${id}/payment`, { amount });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
};

export const useDeleteDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/debts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
};
