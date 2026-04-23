import { apiClient } from '../lib/api';

export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
}

export async function getCurrencyRates(base: string): Promise<CurrencyRates> {
  const response = await apiClient.get<{ data: CurrencyRates }>('/currency/rates', {
    params: { base },
  });
  return response.data.data;
}
