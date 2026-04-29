import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import client from './client';

export type AssetType = 'crypto' | 'stock' | 'etf' | 'bond';
export type HoldingSource = 'manual' | 'binance' | 'csv_import';

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

const STALE_TIME = 1000 * 60 * 2;

export const holdingKeys = {
  all: ['holdings'] as const,
  lists: () => [...holdingKeys.all, 'list'] as const,
  detail: (id: string) => [...holdingKeys.all, 'detail', id] as const,
  portfolio: () => [...holdingKeys.all, 'portfolio'] as const,
};

async function getHoldings(): Promise<HoldingWithValue[]> {
  const response = await client.get<{ data: HoldingWithValue[] }>('/holdings');
  return response.data.data;
}

async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const response = await client.get<{ data: PortfolioSummary }>(
    '/holdings/portfolio/summary',
  );
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
    mutationFn: ({ id, data }: { id: string; data: UpdateHoldingDTO }) =>
      updateHolding(id, data),
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
