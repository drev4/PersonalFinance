import axios, { type AxiosInstance } from 'axios';
import pino from 'pino';
import env from '../../../config/env.js';
import { getRedisClient } from '../../../config/redis.js';

const logger = pino({ name: 'coinmarketcap.client' });

const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com';
const PRICE_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

export interface CmcQuote {
  price: number;
  percent_change_24h: number;
  last_updated: string;
}

export interface CmcSearchResult {
  id: number;
  name: string;
  symbol: string;
  slug: string;
}

function createCmcAxios(): AxiosInstance {
  return axios.create({
    baseURL: CMC_BASE_URL,
    timeout: 10_000,
    headers: {
      'X-CMC_PRO_API_KEY': env.CMC_API_KEY ?? '',
      'Accept': 'application/json',
    },
  });
}

const cmcAxios = createCmcAxios();

/**
 * Fetches latest USD quotes for an array of crypto symbols.
 * Results are cached in Redis for 5 minutes per symbol.
 * Never throws — returns empty object on error.
 */
export async function getLatestQuotes(
  symbols: string[],
): Promise<Record<string, CmcQuote>> {
  if (symbols.length === 0) return {};

  const redis = getRedisClient();
  const result: Record<string, CmcQuote> = {};
  const uncachedSymbols: string[] = [];

  // Check cache for each symbol
  await Promise.all(
    symbols.map(async (symbol) => {
      const cacheKey = `cmc:price:${symbol.toUpperCase()}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached !== null) {
          result[symbol.toUpperCase()] = JSON.parse(cached) as CmcQuote;
        } else {
          uncachedSymbols.push(symbol);
        }
      } catch {
        uncachedSymbols.push(symbol);
      }
    }),
  );

  if (uncachedSymbols.length === 0) return result;

  try {
    const symbolsParam = uncachedSymbols.map((s) => s.toUpperCase()).join(',');
    const response = await cmcAxios.get<{
      data: Record<string, { quote: { USD: CmcQuote } }>;
      status: { error_code: number; error_message: string | null };
    }>('/v1/cryptocurrency/quotes/latest', {
      params: { symbol: symbolsParam, convert: 'USD' },
    });

    const { data, status } = response.data;

    if (status.error_code !== 0) {
      logger.warn(
        { errorCode: status.error_code, message: status.error_message },
        '[CMC] API returned error status',
      );
      return result;
    }

    // Cache each fresh quote and merge into result
    await Promise.all(
      Object.entries(data).map(async ([sym, entry]) => {
        const quote = entry.quote.USD;
        result[sym] = quote;

        const cacheKey = `cmc:price:${sym}`;
        try {
          await redis.set(cacheKey, JSON.stringify(quote), 'EX', PRICE_CACHE_TTL_SECONDS);
        } catch (cacheErr) {
          logger.warn({ cacheErr, sym }, '[CMC] Failed to cache quote');
        }
      }),
    );
  } catch (err) {
    logger.error({ err }, '[CMC] Failed to fetch latest quotes');
  }

  return result;
}

/**
 * Searches CoinMarketCap for crypto assets matching the query string.
 * Filters by name or symbol containing `query` (case-insensitive).
 * Never throws — returns empty array on error.
 */
export async function searchCrypto(query: string): Promise<CmcSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const key = env.CMC_API_KEY;

  if (!key || key.trim() === '') {
    // If no CMC key, use CoinGecko public search as fallback
    try {
      const response = await axios.get<{
        coins: Array<{ id: string; name: string; symbol: string; market_cap_rank: number }>;
      }>('https://api.coingecko.com/api/v3/search', {
        params: { query: query.trim() },
      });

      return response.data.coins
        .slice(0, 20)
        .map((coin, index) => ({
          id: index, // CoinGecko uses string IDs, we map to index for CmcSearchResult compatibility
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          slug: coin.id,
        }));
    } catch (err) {
      logger.error({ err, query }, '[CryptoSearch] Fallback failed');
      return [];
    }
  }

  try {
    const response = await cmcAxios.get<{
      data: Array<{ id: number; name: string; symbol: string; slug: string }>;
      status: { error_code: number };
    }>('/v1/cryptocurrency/map', {
      params: {
        listing_status: 'active',
        limit: 100,
        sort: 'cmc_rank',
      },
    });

    if (response.data.status.error_code !== 0) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    return response.data.data
      .filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.symbol.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        slug: item.slug,
      }));
  } catch (err) {
    logger.error({ err, query }, '[CMC] Failed to search crypto');
    return [];
  }
}
