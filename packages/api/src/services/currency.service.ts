import axios from 'axios';
import pino from 'pino';
import { getRedisClient } from '../config/redis.js';

const logger = pino({ name: 'currency.service' });
const RATES_CACHE_TTL = 3600; // 1 hour
const FRANKFURTER_BASE = 'https://api.frankfurter.app';

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export type ExchangeRates = Record<string, number>;

function ratesCacheKey(base: string): string {
  return `exchange_rates:${base.toUpperCase()}`;
}

/**
 * Returns all exchange rates relative to `base`.
 * The base currency itself is included with rate 1.
 * Results are cached in Redis for 1 hour.
 */
export async function getRates(base: string): Promise<ExchangeRates> {
  const baseUpper = base.toUpperCase();
  const cacheKey = ratesCacheKey(baseUpper);

  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as ExchangeRates;
    }
  } catch (err) {
    logger.warn({ err }, 'Currency rates cache read failed');
  }

  const response = await axios.get<FrankfurterResponse>(`${FRANKFURTER_BASE}/latest`, {
    params: { from: baseUpper },
    timeout: 5000,
  });

  const rates: ExchangeRates = {
    ...response.data.rates,
    [baseUpper]: 1,
  };

  try {
    const redis = getRedisClient();
    await redis.setex(cacheKey, RATES_CACHE_TTL, JSON.stringify(rates));
  } catch (err) {
    logger.warn({ err }, 'Currency rates cache write failed');
  }

  return rates;
}

/**
 * Converts `amountCents` from `from` to `to` using rates fetched once
 * relative to `base`. Pass in a pre-fetched rates object to avoid
 * repeated network calls inside loops.
 *
 * Formula: amountCents / rates[from] * rates[to]
 * (works because rates[base] === 1, covering to/from base as special cases)
 */
export function convertWithRates(
  amountCents: number,
  from: string,
  to: string,
  rates: ExchangeRates,
): number {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();
  if (fromUpper === toUpper) return amountCents;

  const fromRate = rates[fromUpper];
  const toRate = rates[toUpper];

  if (fromRate === undefined || toRate === undefined) {
    logger.warn({ from, to }, 'Exchange rate not found, returning unconverted amount');
    return amountCents;
  }

  return Math.round((amountCents / fromRate) * toRate);
}

/**
 * One-shot conversion of an amount in cents between two currencies.
 * Use `getRates` + `convertWithRates` when converting many amounts for efficiency.
 */
export async function convertCents(
  amountCents: number,
  from: string,
  to: string,
): Promise<number> {
  if (from.toUpperCase() === to.toUpperCase()) return amountCents;
  const rates = await getRates(from.toUpperCase());
  return convertWithRates(amountCents, from, to, rates);
}
