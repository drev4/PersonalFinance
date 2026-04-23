import cron from 'node-cron';
import pino from 'pino';
import { getUniqueSymbolsByType } from '../modules/holdings/holding.repository.js';
import { updatePriceForSymbol } from '../modules/holdings/holding.service.js';
import { PriceSnapshotModel } from '../modules/holdings/priceSnapshot.model.js';
import { getLatestQuotes } from '../modules/holdings/integrations/coinmarketcap.client.js';
import { getQuote } from '../modules/holdings/integrations/finnhub.client.js';

const logger = pino({ name: 'job.priceUpdate' });

// Throttle: max 40 Finnhub calls per run to stay within 60/min hard limit
const FINNHUB_CALLS_PER_MINUTE = 40;
const FINNHUB_INTERVAL_MS = Math.ceil((60_000 / FINNHUB_CALLS_PER_MINUTE));

/** Saves a price snapshot only if no snapshot exists for this symbol in the last hour. */
async function maybeSaveSnapshot(
  symbol: string,
  price: number,
  currency: string,
  source: 'cmc' | 'finnhub',
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const existing = await PriceSnapshotModel.findOne({
    symbol: symbol.toUpperCase(),
    timestamp: { $gte: oneHourAgo },
  })
    .select('_id')
    .lean()
    .exec();

  if (existing !== null) return; // Already saved a snapshot this hour

  await PriceSnapshotModel.create({
    symbol: symbol.toUpperCase(),
    price,
    currency,
    source,
    timestamp: new Date(),
  });
}

/** Delays execution by `ms` milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Crypto price update job  (every 10 minutes)
// ---------------------------------------------------------------------------

async function runCryptoPriceUpdate(): Promise<void> {
  logger.info('Starting crypto price update job');

  try {
    const symbols = await getUniqueSymbolsByType('crypto');
    if (symbols.length === 0) {
      logger.info('No crypto holdings found — skipping CMC fetch');
      return;
    }

    logger.info({ symbols }, '[PriceJob] Fetching crypto quotes from CMC');
    const quotes = await getLatestQuotes(symbols);

    let updated = 0;
    for (const [symbol, quote] of Object.entries(quotes)) {
      const priceInCents = Math.round(quote.price * 100);

      // CMC returns prices in USD; convert to each holding's currency
      await updatePriceForSymbol(symbol, priceInCents, 'USD');
      await maybeSaveSnapshot(symbol, priceInCents, 'USD', 'cmc');
      updated++;
    }

    logger.info({ updated, total: symbols.length }, 'Crypto price update job completed');
  } catch (err) {
    logger.error({ err }, 'Fatal error in crypto price update job');
  }
}

// ---------------------------------------------------------------------------
// Stock/ETF/Bond price update job  (every 15 min, Mon-Fri 07:00-22:00 CET)
// ---------------------------------------------------------------------------

async function runStockPriceUpdate(): Promise<void> {
  logger.info('Starting stock/ETF/bond price update job');

  try {
    const [stockSymbols, etfSymbols, bondSymbols] = await Promise.all([
      getUniqueSymbolsByType('stock'),
      getUniqueSymbolsByType('etf'),
      getUniqueSymbolsByType('bond'),
    ]);

    const allSymbols = [...new Set([...stockSymbols, ...etfSymbols, ...bondSymbols])];

    if (allSymbols.length === 0) {
      logger.info('No stock/ETF/bond holdings found — skipping Finnhub fetch');
      return;
    }

    logger.info({ count: allSymbols.length }, '[PriceJob] Fetching stock quotes from Finnhub');

    let updated = 0;
    for (const symbol of allSymbols) {
      const quote = await getQuote(symbol);

      if (quote !== null && quote.c > 0) {
        const priceInCents = Math.round(quote.c * 100);
        await updatePriceForSymbol(symbol, priceInCents, 'USD');
        await maybeSaveSnapshot(symbol, priceInCents, 'USD', 'finnhub');
        updated++;
      }

      // Throttle to respect Finnhub rate limit (40 calls/min)
      await delay(FINNHUB_INTERVAL_MS);
    }

    logger.info({ updated, total: allSymbols.length }, 'Stock/ETF/bond price update job completed');
  } catch (err) {
    logger.error({ err }, 'Fatal error in stock/ETF/bond price update job');
  }
}

// ---------------------------------------------------------------------------
// Schedule exports
// ---------------------------------------------------------------------------

/**
 * Schedules both price update jobs:
 * - Crypto: every 10 minutes (CMC API)
 * - Stocks/ETFs/Bonds: every 15 minutes, Mon-Fri 07:00-22:00 CET (Finnhub API)
 */
export function schedulePriceUpdateJobs(): void {
  // Crypto — every 10 minutes, all day
  cron.schedule(
    '*/10 * * * *',
    async () => {
      await runCryptoPriceUpdate();
    },
    { timezone: 'UTC' },
  );

  // Stocks/ETFs/Bonds — every 15 minutes, Mon-Fri 07:00-22:00 CET
  // node-cron runs in UTC: CET = UTC+1 (winter) / UTC+2 (summer)
  // Use 06:00-21:00 UTC to cover 07:00-22:00 CET in winter (conservative)
  cron.schedule(
    '*/15 6-21 * * 1-5',
    async () => {
      await runStockPriceUpdate();
    },
    { timezone: 'Europe/Madrid' },
  );

  logger.info('Price update jobs scheduled (crypto: */10 * * * *, stocks: */15 7-22 * * 1-5 CET)');
}
