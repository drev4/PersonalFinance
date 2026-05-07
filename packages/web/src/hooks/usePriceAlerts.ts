import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  togglePriceAlert,
} from '../api/priceAlerts.api';
import type { PriceAlert, CreatePriceAlertDTO } from '../types/api';

export const alertKeys = {
  all: ['price-alerts'] as const,
  byHolding: (holdingId: string) => [...alertKeys.all, holdingId] as const,
};

export function usePriceAlerts(holdingId: string): UseQueryResult<PriceAlert[]> {
  return useQuery({
    queryKey: alertKeys.byHolding(holdingId),
    queryFn: () => getPriceAlerts(holdingId),
    enabled: !!holdingId,
    staleTime: 60 * 1000,
  });
}

export function useCreatePriceAlert(): UseMutationResult<PriceAlert, Error, CreatePriceAlertDTO> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPriceAlert,
    onSuccess: (_, { holdingId }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.byHolding(holdingId) });
    },
  });
}

export function useDeletePriceAlert(): UseMutationResult<
  void,
  Error,
  { id: string; holdingId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; holdingId: string }) => deletePriceAlert(id),
    onSuccess: (_, { holdingId }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.byHolding(holdingId) });
    },
  });
}

export function useTogglePriceAlert(): UseMutationResult<
  PriceAlert,
  Error,
  { id: string; holdingId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; holdingId: string }) => togglePriceAlert(id),
    onSuccess: (_, { holdingId }) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.byHolding(holdingId) });
    },
  });
}
