import { parse } from 'csv-parse/sync';
import axios from 'axios';
import pino from 'pino';
import mongoose from 'mongoose';
import { AccountModel } from '../accounts/account.model.js';
import * as holdingRepository from './holding.repository.js';
import type { CreateHoldingDTO, UpdateHoldingDTO } from './holding.repository.js';
import type { IHolding, AssetType } from './holding.model.js';
import { getLatestQuotes, searchCrypto } from './integrations/coinmarketcap.client.js';
import { getQuote, searchSymbol } from './integrations/finnhub.client.js';

const logger = pino({ name: 'holding.service' });

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface HoldingWithValue extends IHolding {
  currentValue: number;
  totalCost: number;
  pnl: number;
  pnlPercentage: number;
  portfolioPercentage: number;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string | undefined;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercentage: number;
  byAssetType: Array<{ type: string; value: number; percentage: number }>;
  topHoldings: HoldingWithValue[];
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class HoldingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'HoldingError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a quantity string to a float number for arithmetic. */
function quantityToNumber(quantity: string): number {
  const n = parseFloat(quantity);
  return isNaN(n) ? 0 : n;
}

/** Enriches a holding document with computed financial fields. */
function enrichHolding(
  holding: IHolding,
  portfolioTotalValue: number,
): HoldingWithValue {
  const qty = quantityToNumber(holding.quantity);
  const currentPrice = holding.currentPrice ?? 0;
  const avgBuy = holding.averageBuyPrice;

  const currentValue = qty * currentPrice;
  const totalCost = qty * avgBuy;
  const pnl = currentValue - totalCost;
  const pnlPercentage = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const portfolioPercentage =
    portfolioTotalValue > 0 ? (currentValue / portfolioTotalValue) * 100 : 0;

  // Cast to HoldingWithValue by adding computed fields
  const enriched = holding as HoldingWithValue;
  enriched.currentValue = Math.round(currentValue);
  enriched.totalCost = Math.round(totalCost);
  enriched.pnl = Math.round(pnl);
  enriched.pnlPercentage = Math.round(pnlPercentage * 100) / 100;
  enriched.portfolioPercentage = Math.round(portfolioPercentage * 100) / 100;

  return enriched;
}

/** Validates that an accountId belongs to the given userId. */
async function validateAccountOwnership(
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await AccountModel.findOne({
    _id: new mongoose.Types.ObjectId(accountId),
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  })
    .select('_id')
    .lean()
    .exec();

  if (account === null) {
    throw new HoldingError(
      'ACCOUNT_NOT_FOUND',
      'Account not found or does not belong to this user',
      404,
    );
  }
}

/** Fetches the current price (in cents) for a crypto symbol via CMC. */
async function fetchCryptoPrice(symbol: string): Promise<number | undefined> {
  const normalised = symbol.toUpperCase();
  try {
    const quotes = await getLatestQuotes([normalised]);
    const quote = quotes[normalised];
    if (quote !== undefined) {
      // CMC returns USD price as decimal — convert to cents
      return Math.round(quote.price * 100);
    }

    // Fallback to CoinGecko public API if no CMC key or symbol not in top results
    const searchRes = await axios.get<{
      coins: Array<{ id: string; symbol: string }>;
    }>('https://api.coingecko.com/api/v3/search', {
      params: { query: normalised },
    });

    const coin = searchRes.data.coins.find((c) => c.symbol.toUpperCase() === normalised);
    if (!coin) return undefined;

    const priceRes = await axios.get<{
      [key: string]: { eur: number; usd: number };
    }>('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: coin.id, vs_currencies: 'eur' },
    });

    const eurPrice = priceRes.data[coin.id]?.eur;
    if (eurPrice !== undefined) {
      return Math.round(eurPrice * 100);
    }
    return undefined;
  } catch (err) {
    logger.warn({ err, symbol }, '[HoldingService] Failed to fetch crypto price from any source');
    return undefined;
  }
}

/** Fetches the current price (in cents) for a stock/ETF/bond symbol via Finnhub. */
async function fetchStockPrice(symbol: string): Promise<number | undefined> {
  try {
    const quote = await getQuote(symbol);
    if (quote === null) return undefined;
    // Finnhub returns price in the native currency — convert to cents
    return Math.round(quote.c * 100);
  } catch (err) {
    logger.warn({ err, symbol }, '[HoldingService] Failed to fetch stock price from Finnhub');
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// CSV format detection and parsing
// ---------------------------------------------------------------------------

type CsvFormat = 'degiro' | 'etoro' | 'generic';

interface ParsedCsvRow {
  symbol: string;
  quantity: number;
  averageBuyPrice: number; // already in cents
  currency: string;
  exchange?: string | undefined;
}

function detectFormat(headers: string[]): CsvFormat {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const hasDegiro =
    lower.some((h) => h === 'producto' || h === 'product') &&
    (lower.some((h) => h.includes('símbolo') || h.includes('simbolo') || h === 'symbol/isin') ||
      lower.some((h) => h === 'bolsa' || h === 'exchange'));

  if (hasDegiro) return 'degiro';

  const hasEtoro =
    lower.some((h) => h === 'ticker') &&
    lower.some((h) => h === 'unidades' || h === 'units');

  if (hasEtoro) return 'etoro';

  return 'generic';
}

function parseRows(
  records: Record<string, string>[],
  format: CsvFormat,
): { rows: ParsedCsvRow[]; errors: string[] } {
  const rows: ParsedCsvRow[] = [];
  const errors: string[] = [];

  records.forEach((record, index) => {
    const rowNum = index + 2; // 1-based + header row
    try {
      let symbol: string;
      let quantity: number;
      let priceRaw: number;
      let currency: string;
      let exchange: string | undefined;

      // Normalize keys
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(record)) {
        row[k.toLowerCase().trim()] = (v ?? '').trim();
      }

      if (format === 'degiro') {
        // DeGiro columns (ES locale)
        const rawSymbol =
          row['símbolo/isin'] ??
          row['simbolo/isin'] ??
          row['symbol/isin'] ??
          row['símbolo'] ??
          row['simbolo'] ??
          row['symbol'] ??
          '';
        const splitSymbol = rawSymbol.split('/');
        symbol = (splitSymbol[0] ?? '').trim().toUpperCase();
        quantity = parseFloat((row['cantidad'] ?? row['quantity'] ?? '').replace(',', '.'));
        priceRaw = parseFloat(
          (row['precio de cierre'] ?? row['close price'] ?? row['precio'] ?? '0').replace(',', '.'),
        );
        currency = (row['divisa'] ?? row['currency'] ?? 'EUR').toUpperCase();
        exchange = row['bolsa'] ?? row['exchange'];
      } else if (format === 'etoro') {
        symbol = (row['ticker'] ?? '').toUpperCase();
        quantity = parseFloat((row['unidades'] ?? row['units'] ?? '0').replace(',', '.'));
        priceRaw = parseFloat(
          (row['precio de compra'] ?? row['purchase price'] ?? row['precio'] ?? '0').replace(',', '.'),
        );
        currency = (row['divisa'] ?? row['currency'] ?? 'USD').toUpperCase();
      } else {
        // Generic format
        symbol = (row['symbol'] ?? row['ticker'] ?? '').toUpperCase();
        quantity = parseFloat((row['quantity'] ?? row['qty'] ?? '0').replace(',', '.'));
        priceRaw = parseFloat(
          (row['averagebuyprice'] ?? row['average_buy_price'] ?? row['price'] ?? '0').replace(',', '.'),
        );
        currency = (row['currency'] ?? 'USD').toUpperCase();
        exchange = row['exchange'];
      }

      if (!symbol) {
        errors.push(`Row ${rowNum}: missing symbol`);
        return;
      }
      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`Row ${rowNum} (${symbol}): invalid quantity`);
        return;
      }
      if (isNaN(priceRaw) || priceRaw < 0) {
        errors.push(`Row ${rowNum} (${symbol}): invalid price`);
        return;
      }

      rows.push({
        symbol,
        quantity,
        averageBuyPrice: Math.round(priceRaw * 100), // convert to cents
        currency,
        exchange: exchange && exchange.trim() !== '' ? exchange.trim() : undefined,
      });
    } catch (err) {
      errors.push(`Row ${rowNum}: ${String(err)}`);
    }
  });

  return { rows, errors };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getUserHoldings(userId: string): Promise<HoldingWithValue[]> {
  const holdings = await holdingRepository.findByUser(userId);

  // Compute portfolio total value for percentage calculation
  const totalValue = holdings.reduce((sum, h) => {
    const qty = quantityToNumber(h.quantity);
    const price = h.currentPrice ?? 0;
    return sum + qty * price;
  }, 0);

  return holdings.map((h) => enrichHolding(h, totalValue));
}

export async function createHolding(
  userId: string,
  dto: CreateHoldingDTO,
): Promise<IHolding> {
  // Validate account ownership
  await validateAccountOwnership(userId, dto.accountId);

  let currentPrice: number | undefined;
  let priceUpdatedAt: Date | undefined;

  if (dto.assetType === 'crypto') {
    currentPrice = await fetchCryptoPrice(dto.symbol);
    if (currentPrice !== undefined) priceUpdatedAt = new Date();
  } else {
    currentPrice = await fetchStockPrice(dto.symbol);
    if (currentPrice !== undefined) priceUpdatedAt = new Date();
  }

  const holding = await holdingRepository.create({
    ...dto,
    userId,
    currentPrice: currentPrice ?? dto.currentPrice,
    priceUpdatedAt: priceUpdatedAt ?? dto.priceUpdatedAt,
    source: dto.source ?? 'manual',
  });

  // Invalidate dashboard cache
  import('../dashboard/dashboard.service.js').then(m => m.invalidateNetWorthCache(userId)).catch(() => { });

  return holding;
}

export async function updateHolding(
  userId: string,
  holdingId: string,
  dto: UpdateHoldingDTO,
): Promise<IHolding> {
  const existing = await holdingRepository.findById(holdingId, userId);
  if (existing === null) {
    throw new HoldingError('HOLDING_NOT_FOUND', 'Holding not found', 404);
  }

  // If accountId is changing, validate new account ownership
  if (dto.accountId !== undefined && dto.accountId !== existing.accountId.toHexString()) {
    await validateAccountOwnership(userId, dto.accountId);
  }

  const updated = await holdingRepository.update(holdingId, userId, dto);
  if (updated === null) {
    throw new HoldingError('HOLDING_NOT_FOUND', 'Holding not found', 404);
  }

  // Invalidate dashboard cache
  import('../dashboard/dashboard.service.js').then(m => m.invalidateNetWorthCache(userId)).catch(() => { });

  return updated;
}

export async function deleteHolding(
  userId: string,
  holdingId: string,
): Promise<void> {
  const deleted = await holdingRepository.deleteHolding(holdingId, userId);
  if (!deleted) {
    throw new HoldingError('HOLDING_NOT_FOUND', 'Holding not found', 404);
  }

  // Invalidate dashboard cache
  import('../dashboard/dashboard.service.js').then(m => m.invalidateNetWorthCache(userId)).catch(() => { });
}

export async function searchTicker(
  query: string,
  type: 'crypto' | 'stock',
): Promise<TickerSearchResult[]> {
  if (type === 'crypto') {
    const results = await searchCrypto(query);
    return results.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      type: 'crypto',
    }));
  }

  const results = await searchSymbol(query);
  return results.map((r) => ({
    symbol: r.symbol,
    name: r.description,
    type: r.type.toLowerCase(),
    exchange: r.displaySymbol.includes(':')
      ? r.displaySymbol.split(':')[0]
      : undefined,
  }));
}

export async function importFromCsv(
  userId: string,
  accountId: string,
  csvContent: string,
): Promise<ImportResult> {
  await validateAccountOwnership(userId, accountId);

  let records: Record<string, string>[];
  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch (err) {
    return { created: 0, updated: 0, errors: [`CSV parse error: ${String(err)}`] };
  }

  if (!records || records.length === 0) {
    return { created: 0, updated: 0, errors: ['CSV file is empty or has no data rows'] };
  }

  const headers = Object.keys(records[0] ?? {});
  const format = detectFormat(headers);
  logger.info({ format, rowCount: records.length }, '[Holdings] CSV import detected format');

  const { rows, errors } = parseRows(records, format);

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    try {
      const existing = await holdingRepository.findBySymbol(userId, row.symbol);

      if (existing !== null) {
        // Weighted-average for averageBuyPrice
        const existingQty = quantityToNumber(existing.quantity);
        const newQty = row.quantity;
        const totalQty = existingQty + newQty;
        const weightedAvgPrice =
          (existingQty * existing.averageBuyPrice + newQty * row.averageBuyPrice) / totalQty;

        await holdingRepository.update(existing._id.toHexString(), userId, {
          quantity: String(totalQty),
          averageBuyPrice: Math.round(weightedAvgPrice),
          currency: row.currency,
          exchange: row.exchange,
          source: 'csv_import',
        });
        updated++;
      } else {
        // Infer assetType from symbol characteristics (best-effort heuristic)
        const assetType = inferAssetType(row.symbol);

        await holdingRepository.create({
          userId,
          accountId,
          assetType,
          symbol: row.symbol,
          exchange: row.exchange,
          quantity: String(row.quantity),
          averageBuyPrice: row.averageBuyPrice,
          currency: row.currency,
          source: 'csv_import',
        });
        created++;
      }
    } catch (err) {
      errors.push(`Failed to upsert ${row.symbol}: ${String(err)}`);
    }
  }

  if (created > 0 || updated > 0) {
    import('../dashboard/dashboard.service.js').then(m => m.invalidateNetWorthCache(userId)).catch(() => { });
  }

  return { created, updated, errors };
}

/** Heuristic to infer assetType from a symbol string. */
function inferAssetType(symbol: string): AssetType {
  const cryptoSymbols = new Set([
    'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'DOGE', 'AVAX',
    'MATIC', 'LTC', 'LINK', 'UNI', 'ATOM', 'XLM', 'TRX', 'ALGO', 'VET',
  ]);
  if (cryptoSymbols.has(symbol.toUpperCase())) return 'crypto';

  // ETFs typically contain dots or are well-known ETF tickers
  const etfPatterns = /^(VWCE|IWDA|CSPX|SPY|QQQ|VTI|VOO|ARKK|IEMG|AGG)\b/i;
  if (etfPatterns.test(symbol)) return 'etf';

  return 'stock';
}

export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  const holdings = await getUserHoldings(userId);

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercentage = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Group by assetType
  const byTypeMap = new Map<string, number>();
  for (const h of holdings) {
    const existing = byTypeMap.get(h.assetType) ?? 0;
    byTypeMap.set(h.assetType, existing + h.currentValue);
  }

  const byAssetType = Array.from(byTypeMap.entries()).map(([type, value]) => ({
    type,
    value,
    percentage: totalValue > 0 ? Math.round((value / totalValue) * 10000) / 100 : 0,
  }));

  // Top 5 holdings by current value
  const topHoldings = [...holdings]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 5);

  return {
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPercentage: Math.round(totalPnlPercentage * 100) / 100,
    byAssetType,
    topHoldings,
  };
}
