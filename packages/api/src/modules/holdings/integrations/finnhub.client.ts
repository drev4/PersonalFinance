import axios, { type AxiosInstance } from 'axios';
import pino from 'pino';
import env from '../../../config/env.js';
import { getRedisClient } from '../../../config/redis.js';

const logger = pino({ name: 'finnhub.client' });

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const QUOTE_CACHE_TTL_SECONDS = 15 * 60;       // 15 minutes
const EXCHANGES_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// Rate limit: max 60 calls/min. We track with a Redis sliding window counter.
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_CALLS = 55; // leave a buffer below the 60 hard limit
const RATE_LIMIT_KEY = 'finnhub:rate_limit:calls';

export interface FinnhubQuote {
  c: number;  // current price
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp (unix)
}

export interface FinnhubSearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface FinnhubExchange {
  code: string;
  currency: string;
  name: string;
  mic: string;
}

function createFinnhubAxios(): AxiosInstance {
  return axios.create({
    baseURL: FINNHUB_BASE_URL,
    timeout: 10_000,
    params: { token: env.FINNHUB_API_KEY ?? '' },
    headers: { 'Accept': 'application/json' },
  });
}

const finnhubAxios = createFinnhubAxios();

/**
 * Enforces the Finnhub rate limit (max 55 calls per 60s window) using Redis.
 * Returns true if the call is allowed, false if rate-limited.
 */
async function checkRateLimit(): Promise<boolean> {
  const redis = getRedisClient();
  try {
    const current = await redis.incr(RATE_LIMIT_KEY);
    if (current === 1) {
      // First call in this window — set the expiry
      await redis.expire(RATE_LIMIT_KEY, RATE_LIMIT_WINDOW_SECONDS);
    }
    return current <= RATE_LIMIT_MAX_CALLS;
  } catch {
    // If Redis fails, allow the call (fail open)
    return true;
  }
}

/**
 * Fetches the latest quote for a stock/ETF/bond symbol.
 * Results are cached in Redis for 15 minutes.
 * Never throws — returns null on error or rate limit.
 */
export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!symbol || symbol.trim().length === 0) return null;

  const normalizedSymbol = symbol.trim().toUpperCase();
  const cacheKey = `finnhub:quote:${normalizedSymbol}`;
  const redis = getRedisClient();

  // Check cache first (avoids hitting rate limit)
  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as FinnhubQuote;
    }
  } catch {
    // Cache miss — proceed to API call
  }

  const allowed = await checkRateLimit();
  if (!allowed) {
    logger.warn({ symbol: normalizedSymbol }, '[Finnhub] Rate limit reached, skipping quote fetch');
    return null;
  }

  try {
    const response = await finnhubAxios.get<FinnhubQuote>('/quote', {
      params: { symbol: normalizedSymbol },
    });

    const quote = response.data;

    // Finnhub returns { c: 0 } when symbol is not found
    if (quote.c === 0 && quote.t === 0) {
      logger.warn({ symbol: normalizedSymbol }, '[Finnhub] Symbol not found or no data');
      return null;
    }

    // Cache the result
    try {
      await redis.set(cacheKey, JSON.stringify(quote), 'EX', QUOTE_CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      logger.warn({ cacheErr }, '[Finnhub] Failed to cache quote');
    }

    return quote;
  } catch (err) {
    logger.error({ err, symbol: normalizedSymbol }, '[Finnhub] Failed to fetch quote');
    return null;
  }
}

/**
 * Searches Finnhub for stock symbols matching the query.
 * Not cached (interactive search).
 * Never throws — returns empty array on error.
 */
export async function searchSymbol(query: string): Promise<FinnhubSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const allowed = await checkRateLimit();
  if (!allowed) {
    logger.warn('[Finnhub] Rate limit reached, skipping symbol search');
    return [];
  }

  try {
    const response = await finnhubAxios.get<{
      count: number;
      result: FinnhubSearchResult[];
    }>('/search', {
      params: { q: query.trim() },
    });

    return response.data.result ?? [];
  } catch (err) {
    logger.error({ err, query }, '[Finnhub] Failed to search symbol');
    return [];
  }
}

/**
 * Fetches available stock exchanges from Finnhub.
 * Cached in Redis for 24 hours.
 * Never throws — returns empty array on error.
 */
export async function getExchanges(): Promise<FinnhubExchange[]> {
  const cacheKey = 'finnhub:exchanges';
  const redis = getRedisClient();

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as FinnhubExchange[];
    }
  } catch {
    // Proceed to API call
  }

  const allowed = await checkRateLimit();
  if (!allowed) {
    logger.warn('[Finnhub] Rate limit reached, skipping exchanges fetch');
    return [];
  }

  try {
    const response = await finnhubAxios.get<FinnhubExchange[]>('/stock/exchange');
    const exchanges = response.data ?? [];

    try {
      await redis.set(cacheKey, JSON.stringify(exchanges), 'EX', EXCHANGES_CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      logger.warn({ cacheErr }, '[Finnhub] Failed to cache exchanges');
    }

    return exchanges;
  } catch (err) {
    logger.error({ err }, '[Finnhub] Failed to fetch exchanges');
    return [];
  }
}
