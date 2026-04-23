import { apiClient } from '../lib/api';
import type {
  NetWorthSummary,
  NetWorthPoint,
  NetWorthHistoryPeriod,
  CashflowMonth,
  CategorySpendingItem,
  Transaction,
} from '../types/api';

export async function getDashboardNetWorth(): Promise<NetWorthSummary> {
  const response = await apiClient.get<{ data: NetWorthSummary }>('/dashboard/net-worth');
  return response.data.data;
}

export async function getNetWorthHistory(
  period: NetWorthHistoryPeriod,
): Promise<NetWorthPoint[]> {
  const response = await apiClient.get<{ data: NetWorthPoint[] }>(
    '/dashboard/net-worth/history',
    { params: { period } },
  );
  return response.data.data;
}

export async function getDashboardCashflow(months: number): Promise<CashflowMonth[]> {
  const response = await apiClient.get<{ data: CashflowMonth[] }>('/dashboard/cashflow', {
    params: { months },
  });
  return response.data.data;
}

export async function getDashboardSpendingByCategory(
  from: string,
  to: string,
): Promise<CategorySpendingItem[]> {
  const response = await apiClient.get<{ data: CategorySpendingItem[] }>(
    '/dashboard/spending-by-category',
    { params: { from, to } },
  );
  return response.data.data;
}

export async function getUpcomingRecurring(days = 30): Promise<Transaction[]> {
  const response = await apiClient.get<{ data: Transaction[] }>(
    '/dashboard/upcoming-recurring',
    { params: { days } },
  );
  return response.data.data;
}
