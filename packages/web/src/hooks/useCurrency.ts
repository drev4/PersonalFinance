import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { getCurrencyRates, type CurrencyRates } from '../api/currency.api';

export const currencyKeys = {
  all: ['currency'] as const,
  rates: (base: string) => [...currencyKeys.all, 'rates', base] as const,
};

export function useCurrencyRates(base?: string): UseQueryResult<CurrencyRates> {
  const user = useAuthStore((s) => s.user);
  const baseCurrency = (base ?? user?.baseCurrency ?? 'EUR').toUpperCase();

  return useQuery({
    queryKey: currencyKeys.rates(baseCurrency),
    queryFn: () => getCurrencyRates(baseCurrency),
    staleTime: 1000 * 60 * 60, // 1 hour — same TTL as server-side cache
    enabled: Boolean(user),
  });
}

/**
 * Returns a `convert(amount, from, to)` function based on exchange rates
 * relative to the user's base currency. All amounts are plain numbers
 * (not cents — caller decides the unit).
 *
 * Returns `null` if rates haven't loaded yet or a currency pair is unknown.
 *
 * Conversion formula:
 *   result = amount / rates[from] * rates[to]
 * This works for all combinations because rates[baseCurrency] === 1.
 */
export function useCurrencyConverter(): {
  convert: (amount: number, from: string, to: string) => number | null;
  baseCurrency: string;
  isLoading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const baseCurrency = (user?.baseCurrency ?? 'EUR').toUpperCase();
  const { data: ratesData, isLoading } = useCurrencyRates(baseCurrency);

  function convert(amount: number, from: string, to: string): number | null {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    if (fromUpper === toUpper) return amount;
    if (!ratesData) return null;

    const fromRate = ratesData.rates[fromUpper];
    const toRate = ratesData.rates[toUpper];
    if (fromRate === undefined || toRate === undefined) return null;

    return (amount / fromRate) * toRate;
  }

  return { convert, baseCurrency, isLoading };
}
