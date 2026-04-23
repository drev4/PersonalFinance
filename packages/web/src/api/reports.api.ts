import { apiClient } from '../lib/api';

export async function downloadMonthlyReport(year: number, month: number): Promise<Blob> {
  const response = await apiClient.get<Blob>('/reports/monthly', {
    params: { year, month },
    responseType: 'blob',
  });
  return response.data;
}

export async function downloadYearlyReport(year: number): Promise<Blob> {
  const response = await apiClient.get<Blob>('/reports/yearly', {
    params: { year },
    responseType: 'blob',
  });
  return response.data;
}

export async function exportTransactionsCsv(filters: {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
}): Promise<Blob> {
  const response = await apiClient.get<Blob>('/reports/export/transactions', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
}
