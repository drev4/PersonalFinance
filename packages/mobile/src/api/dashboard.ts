import { useQuery } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';
import type { Transaction as TransactionData, Account as TransactionAccount } from './transactions';

export interface NetWorthData {
  total: number;
  assets: number;
  liabilities: number;
  breakdown: Record<string, number>;
  currency: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  date: string;
  category?: string;
}

export interface SpendingCategory {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
}

export interface DashboardSummary {
  netWorth: number;
  netWorthChange24h: number;
  netWorthChange30d: number;
  sparklineData: number[];
  monthlyExpense: number;
  monthlyBudget: number;
  topAccounts: Account[];
  recentTransactions: Transaction[];
}

export interface CashflowMonth {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export const useCashflow = (months: number) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<CashflowMonth[]>({
    queryKey: ['dashboard', 'cashflow', months],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: CashflowMonth[] }>(
        `/dashboard/cashflow?months=${months}`,
      );
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export interface HealthScoreArea {
  key: string;
  label: string;
  score: number;
  max: number;
  detail: string;
}

export interface HealthScore {
  score: number;
  label: string;
  color: string;
  areas: HealthScoreArea[];
}

export const useHealthScore = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<HealthScore>({
    queryKey: ['dashboard', 'health-score'],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: HealthScore }>('/dashboard/health-score');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export interface UpcomingTransaction {
  _id: string;
  description: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  accountId: string;
  categoryId?: string;
  recurring: {
    nextDate: string;
    frequency: string;
    interval: number;
  };
}

export const useUpcomingRecurring = (days = 60) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<UpcomingTransaction[]>({
    queryKey: ['dashboard', 'upcoming-recurring', days],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await client.get<{ data: UpcomingTransaction[] }>(
        `/dashboard/upcoming-recurring?days=${days}`,
      );
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useDashboardSummary = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    enabled: !!accessToken,
    queryFn: async () => {
      const [netWorthRes, spendingRes, accountsRes, transactionsRes] = await Promise.all([
        client.get<{ data: NetWorthData }>('/dashboard/net-worth'),
        client.get<{ data: SpendingCategory[] }>('/dashboard/spending-by-category'),
        client.get<{ data: { _id: string; name: string; currentBalance: number }[] }>('/accounts'),
        client.get<{
          data: {
            data: {
              _id: string;
              description: string;
              amount: number;
              type: string;
              date: string;
              categoryId?: string;
            }[];
            meta: unknown;
          };
        }>('/transactions?limit=5'),
      ]);

      const netWorthData = netWorthRes.data?.data || {};
      const spendingData = spendingRes.data?.data || {};
      const accountsData = accountsRes.data?.data || [];
      const transactionsData = transactionsRes.data?.data?.data || [];

      const totalSpending = Array.isArray(spendingData)
        ? spendingData.reduce((sum, cat) => sum + (cat.total || 0), 0)
        : 0;

      return {
        netWorth: netWorthData.total || 0,
        netWorthChange24h: 0,
        netWorthChange30d: 0,
        sparklineData: [],
        monthlyExpense: totalSpending,
        monthlyBudget: 2000 * 100,
        topAccounts: accountsData.map((acc) => ({
          id: acc._id,
          name: acc.name,
          balance: acc.currentBalance || 0,
        })),
        recentTransactions: transactionsData.map((tx) => ({
          id: tx._id,
          description: tx.description,
          amount: tx.amount || 0,
          type: (tx.type as 'expense' | 'income' | 'transfer') || 'expense',
          date: tx.date,
          category: tx.categoryId,
        })),
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
