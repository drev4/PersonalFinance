import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import client from './client';

export type AssetType = 'crypto' | 'stock' | 'etf' | 'bond';
export type HoldingSource = 'manual' | 'binance' | 'csv_import';
export type IncomeType = 'dividend' | 'staking';

export interface Holding {
  _id: string;
  userId: string;
  accountId: string;
  assetType: AssetType;
  symbol: string;
  exchange?: string;
  quantity: string;
  averageBuyPrice: number;
  currency: string;
  currentPrice?: number;
  priceUpdatedAt?: string;
  source: HoldingSource;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingWithValue extends Holding {
  currentValue: number;
  totalCost: number;
  pnl: number;
  pnlPercentage: number;
  portfolioPercentage: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
  totalDividendsYtd: number;
  byAssetType: { type: AssetType; value: number; percentage: number }[];
  topHoldings: HoldingWithValue[];
}

export interface CreateHoldingDTO {
  accountId: string;
  assetType: AssetType;
  symbol: string;
  exchange?: string;
  quantity: string;
  averageBuyPrice: number;
  currency: string;
  currentPrice?: number;
}

export interface UpdateHoldingDTO {
  accountId?: string;
  currency?: string;
  quantity?: string;
  averageBuyPrice?: number;
  currentPrice?: number;
}

export interface HoldingIncome {
  _id: string;
  holdingId: string;
  userId: string;
  type: IncomeType;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeHistory {
  records: HoldingIncome[];
  totalYtd: number;
}

export interface AddIncomeDTO {
  type: IncomeType;
  amount: number;
  currency: string;
  date: string;
  notes?: string;
}

const STALE_TIME = 1000 * 60 * 2;

export const holdingKeys = {
  all: ['holdings'] as const,
  lists: () => [...holdingKeys.all, 'list'] as const,
  detail: (id: string) => [...holdingKeys.all, 'detail', id] as const,
  portfolio: () => [...holdingKeys.all, 'portfolio'] as const,
  income: (holdingId: string) => [...holdingKeys.all, 'income', holdingId] as const,
};

async function getHoldings(): Promise<HoldingWithValue[]> {
  const response = await client.get<{ data: HoldingWithValue[] }>('/holdings');
  return response.data.data;
}

async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const response = await client.get<{ data: PortfolioSummary }>('/holdings/portfolio/summary');
  return response.data.data;
}

async function createHolding(data: CreateHoldingDTO): Promise<Holding> {
  const response = await client.post<{ data: Holding }>('/holdings', data);
  return response.data.data;
}

async function updateHolding(id: string, data: UpdateHoldingDTO): Promise<Holding> {
  const response = await client.patch<{ data: Holding }>(`/holdings/${id}`, data);
  return response.data.data;
}

async function deleteHolding(id: string): Promise<void> {
  await client.delete(`/holdings/${id}`);
}

async function getHoldingIncomeHistory(holdingId: string): Promise<IncomeHistory> {
  const response = await client.get<{ data: IncomeHistory }>(`/holdings/${holdingId}/income`);
  return response.data.data;
}

async function addDividend(holdingId: string, data: AddIncomeDTO): Promise<HoldingIncome> {
  const response = await client.post<{ data: HoldingIncome }>(
    `/holdings/${holdingId}/dividend`,
    data,
  );
  return response.data.data;
}

export const useHoldings = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: holdingKeys.lists(),
    queryFn: getHoldings,
    staleTime: STALE_TIME,
    enabled: !!accessToken,
  });
};

export const usePortfolioSummary = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: holdingKeys.portfolio(),
    queryFn: getPortfolioSummary,
    staleTime: STALE_TIME,
    enabled: !!accessToken,
  });
};

export const useCreateHolding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateHolding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHoldingDTO }) => updateHolding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteHolding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useHoldingIncomeHistory = (holdingId: string | null) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: holdingId ? holdingKeys.income(holdingId) : ['income', 'noop'],
    queryFn: () => getHoldingIncomeHistory(holdingId!),
    staleTime: STALE_TIME,
    enabled: !!accessToken && holdingId !== null,
  });
};

export const useAddDividend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holdingId, data }: { holdingId: string; data: AddIncomeDTO }) =>
      addDividend(holdingId, data),
    onSuccess: (_, { holdingId }) => {
      queryClient.invalidateQueries({ queryKey: holdingKeys.income(holdingId) });
      queryClient.invalidateQueries({ queryKey: holdingKeys.portfolio() });
    },
  });
};
