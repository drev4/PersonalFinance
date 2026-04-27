import { useQuery } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

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

export const useDashboardSummary = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    enabled: !!accessToken,
    queryFn: async () => {
      try {
        const [netWorthRes, spendingRes, accountsRes, transactionsRes] = await Promise.all([
          client.get<{ data: NetWorthData }>('/dashboard/net-worth'),
          client.get<{ data: SpendingCategory[] }>('/dashboard/spending-by-category'),
          client.get<{ data: { _id: string; name: string; currentBalance: number }[] }>('/accounts'),
          client.get<{ data: { data: { _id: string; description: string; amount: number; type: string; date: string; categoryId?: string }[]; meta: unknown } }>('/transactions?limit=5'),
        ]);

        const netWorthData = netWorthRes.data?.data || {};
        const spendingData = spendingRes.data?.data || {};
        const accountsData = accountsRes.data?.data || [];
        const transactionsData = transactionsRes.data?.data?.data || [];

        const totalSpending = Array.isArray(spendingData)
          ? spendingData.reduce((sum, cat) => sum + (cat.total || 0), 0)
          : 0;

        return {
          netWorth: (netWorthData.total || 0) / 100,
          netWorthChange24h: 0,
          netWorthChange30d: 0,
          sparklineData: [],
          monthlyExpense: totalSpending / 100,
          monthlyBudget: 2000,
          topAccounts: accountsData.map((acc) => ({
            id: acc._id,
            name: acc.name,
            balance: (acc.currentBalance || 0) / 100,
          })),
          recentTransactions: transactionsData.map((tx) => ({
            id: tx._id,
            description: tx.description,
            amount: (tx.amount || 0) / 100,
            type: (tx.type as 'expense' | 'income' | 'transfer') || 'expense',
            date: tx.date,
            category: tx.categoryId,
          })),
        };
      } catch (error) {
        console.log('Dashboard API error:', error);
        return {
          netWorth: 0,
          netWorthChange24h: 0,
          netWorthChange30d: 0,
          sparklineData: [],
          monthlyExpense: 0,
          monthlyBudget: 2000,
          topAccounts: [],
          recentTransactions: [],
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
