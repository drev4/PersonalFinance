import { apiClient } from '../lib/api';
import type { IntegrationStatus, IntegrationProvider } from '../types/api';

export async function getIntegrations(): Promise<IntegrationStatus[]> {
  const response = await apiClient.get<{ data: IntegrationStatus[] }>('/integrations');
  return response.data.data;
}

export async function getIntegrationStatus(
  provider: IntegrationProvider,
): Promise<IntegrationStatus> {
  const response = await apiClient.get<{ data: IntegrationStatus }>(
    `/integrations/${provider}/status`,
  );
  return response.data.data;
}

export async function connectBinance(apiKey: string, apiSecret: string): Promise<void> {
  await apiClient.post('/integrations/binance/connect', { apiKey, apiSecret });
}

export async function triggerSync(provider: IntegrationProvider): Promise<{ jobId: string }> {
  const response = await apiClient.post<{ data: { jobId: string } }>(
    `/integrations/${provider}/sync`,
  );
  return response.data.data;
}

export async function disconnectIntegration(provider: IntegrationProvider): Promise<void> {
  await apiClient.delete(`/integrations/${provider}`);
}
