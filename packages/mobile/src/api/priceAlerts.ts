import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import client from './client';

export interface PriceAlert {
  _id: string;
  userId: string;
  holdingId: string;
  symbol: string;
  assetType: string;
  condition: 'above' | 'below';
  targetPrice: number; // cents
  currency: string;
  isActive: boolean;
  triggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceAlertDTO {
  holdingId: string;
  condition: 'above' | 'below';
  targetPrice: number; // cents
}

export const alertKeys = {
  all: ['price-alerts'] as const,
  byHolding: (holdingId: string) => [...alertKeys.all, holdingId] as const,
};

export const usePriceAlerts = (holdingId: string) => {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery<PriceAlert[]>({
    queryKey: alertKeys.byHolding(holdingId),
    enabled: !!accessToken && !!holdingId,
    queryFn: async () => {
      const response = await client.get<{ data: PriceAlert[] }>(
        `/price-alerts?holdingId=${holdingId}`,
      );
      return response.data.data ?? [];
    },
    staleTime: 60 * 1000,
  });
};

export const useCreatePriceAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePriceAlertDTO) => {
      const response = await client.post<{ data: PriceAlert }>('/price-alerts', dto);
      return response.data.data;
    },
    onSuccess: (_, { holdingId }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.byHolding(holdingId) });
    },
  });
};

export const useDeletePriceAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; holdingId: string }) => {
      await client.delete(`/price-alerts/${id}`);
    },
    onSuccess: (_, { holdingId }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.byHolding(holdingId) });
    },
  });
};

export const useTogglePriceAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; holdingId: string }) => {
      const response = await client.patch<{ data: PriceAlert }>(`/price-alerts/${id}/toggle`);
      return response.data.data;
    },
    onSuccess: (_, { holdingId }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.byHolding(holdingId) });
    },
  });
};
