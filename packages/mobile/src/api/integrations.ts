import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from './client';
import { useAuthStore } from '@/stores/authStore';

export interface Integration {
  id: string;
  provider: string;
  status: 'active' | 'error' | 'syncing' | 'pending';
  lastSyncAt?: string;
  error?: string;
}

const integrationKeys = {
  all: ['integrations'] as const,
};

export function useIntegrations() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: integrationKeys.all,
    queryFn: async () => {
      const res = await client.get<{ data: Integration[] }>('/integrations');
      return res.data.data;
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
  });
}

export function useConnectBinance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { apiKey: string; apiSecret: string }) => {
      const res = await client.post<{ data: { message: string } }>('/integrations/binance', payload);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: string) => {
      await client.delete(`/integrations/${provider}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}

export function useSyncIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (provider: string) => {
      const res = await client.post<{ data: { message: string } }>(`/integrations/${provider}/sync`, {});
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}
