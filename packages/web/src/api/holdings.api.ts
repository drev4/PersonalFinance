import { apiClient } from '../lib/api';
import type {
  Holding,
  HoldingWithValue,
  PortfolioSummary,
  TickerSearchResult,
  ImportResult,
  CreateHoldingDTO,
  UpdateHoldingDTO,
} from '../types/api';

export async function getHoldings(): Promise<HoldingWithValue[]> {
  const response = await apiClient.get<{ data: HoldingWithValue[] }>('/holdings');
  return response.data.data;
}

export async function getHolding(id: string): Promise<HoldingWithValue> {
  const response = await apiClient.get<{ data: HoldingWithValue }>(`/holdings/${id}`);
  return response.data.data;
}

export async function createHolding(data: CreateHoldingDTO): Promise<Holding> {
  const response = await apiClient.post<{ data: Holding }>('/holdings', data);
  return response.data.data;
}

export async function updateHolding(id: string, data: UpdateHoldingDTO): Promise<Holding> {
  const response = await apiClient.patch<{ data: Holding }>(`/holdings/${id}`, data);
  return response.data.data;
}

export async function deleteHolding(id: string): Promise<void> {
  await apiClient.delete(`/holdings/${id}`);
}

export async function searchTicker(
  query: string,
  type: 'crypto' | 'stock',
): Promise<TickerSearchResult[]> {
  const response = await apiClient.get<{ data: TickerSearchResult[] }>('/holdings/search', {
    params: { q: query, type },
  });
  return response.data.data;
}

export async function importFromCsv(
  accountId: string,
  csvContent: string,
): Promise<ImportResult> {
  const response = await apiClient.post<{ data: ImportResult }>('/holdings/import-csv', {
    accountId,
    csvContent,
  });
  return response.data.data;
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const response = await apiClient.get<{ data: PortfolioSummary }>('/holdings/portfolio/summary');
  return response.data.data;
}
