import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getIntegrations,
  getIntegrationStatus,
  connectBinance,
  triggerSync,
  disconnectIntegration,
} from '../api/integrations.api';
import type { IntegrationStatus, IntegrationProvider } from '../types/api';

const STALE_TIME = 1000 * 30; // 30 segundos

export const integrationKeys = {
  all: ['integrations'] as const,
  lists: () => [...integrationKeys.all, 'list'] as const,
  status: (provider: IntegrationProvider) =>
    [...integrationKeys.all, 'status', provider] as const,
};

export function useIntegrations(): UseQueryResult<IntegrationStatus[]> {
  return useQuery({
    queryKey: integrationKeys.lists(),
    queryFn: getIntegrations,
    staleTime: STALE_TIME,
  });
}

export function useIntegrationStatus(
  provider: IntegrationProvider,
): UseQueryResult<IntegrationStatus> {
  return useQuery({
    queryKey: integrationKeys.status(provider),
    queryFn: () => getIntegrationStatus(provider),
    staleTime: STALE_TIME,
    refetchInterval: (query) =>
      query.state.data?.lastSyncStatus === 'pending' ? 3000 : false,
  });
}

export function useConnectBinance(): UseMutationResult<
  void,
  Error,
  { apiKey: string; apiSecret: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ apiKey, apiSecret }) => connectBinance(apiKey, apiSecret),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
    },
  });
}

export function useTriggerSync(): UseMutationResult<
  { jobId: string },
  Error,
  IntegrationProvider
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
}

export function useDisconnectIntegration(): UseMutationResult<
  void,
  Error,
  IntegrationProvider
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectIntegration,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationKeys.all });
    },
  });
}
