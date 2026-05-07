import { apiClient } from '../lib/api';
import type { PriceAlert, CreatePriceAlertDTO } from '../types/api';

export async function getPriceAlerts(holdingId: string): Promise<PriceAlert[]> {
  const response = await apiClient.get<{ data: PriceAlert[] }>(
    `/price-alerts?holdingId=${holdingId}`,
  );
  return response.data.data ?? [];
}

export async function createPriceAlert(dto: CreatePriceAlertDTO): Promise<PriceAlert> {
  const response = await apiClient.post<{ data: PriceAlert }>('/price-alerts', dto);
  return response.data.data;
}

export async function deletePriceAlert(id: string): Promise<void> {
  await apiClient.delete(`/price-alerts/${id}`);
}

export async function togglePriceAlert(id: string): Promise<PriceAlert> {
  const response = await apiClient.patch<{ data: PriceAlert }>(`/price-alerts/${id}/toggle`);
  return response.data.data;
}
