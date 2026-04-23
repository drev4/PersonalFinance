import mongoose from 'mongoose';
import pino from 'pino';
import { AccountModel } from '../accounts/account.model.js';
import { TransactionModel, type ITransaction } from '../transactions/transaction.model.js';
import { getRates, convertWithRates, type ExchangeRates } from '../../services/currency.service.js';
import { CategoryModel } from '../categories/category.model.js';
import {
  getCashflow as repoCashflow,
  getSpendingByCategory as repoSpendingByCategory,
} from '../transactions/transaction.repository.js';
import {
  NetWorthSnapshotModel,
  type INetWorthBreakdown,
} from './netWorthSnapshot.model.js';
import { getRedisClient } from '../../config/redis.js';

const logger = pino({ name: 'dashboard.service' });

/** Redis cache TTL (seconds) for the real-time net-worth calculation. */
const NET_WORTH_CACHE_TTL_SECONDS = 30;

/** Redis key namespace for the net-worth cache. */
function netWorthCacheKey(userId: string): string {
  return `net_worth:${userId}`;
}

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface NetWorthSummary {
  total: number;
  assets: number;
  liabilities: number;
  breakdown: INetWorthBreakdown;
  currency: string;
}

export interface NetWorthPoint {
  date: string;
  total: number;
  breakdown: INetWorthBreakdown;
}

export interface CashflowMonth {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CategorySpending {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
}

export type NetWorthPeriod = '1m' | '3m' | '6m' | '1y' | 'all';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns midnight UTC for a given date (or today). */
function midnightUTC(d: Date = new Date()): Date {
  const result = new Date(d);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/** Maps AccountType to breakdown bucket. Returns null for untracked types. */
function bucketForType(
  type: string,
): keyof INetWorthBreakdown | null {
  switch (type) {
    case 'checking':
    case 'savings':
    case 'cash':
      return 'cash';
    case 'investment':
    case 'crypto':
    case 'stock':
    case 'etf':
    case 'bond':
      return 'investments';
    case 'real_estate':
      return 'realEstate';
    case 'vehicle':
      return 'vehicles';
    case 'loan':
    case 'mortgage':
    case 'credit_card':
      return 'debts';
    default:
      return null;
  }
}

/** Resolve the start date for a history period. */
function periodStartDate(period: NetWorthPeriod): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const map: Record<Exclude<NetWorthPeriod, 'all'>, number> = {
    '1m': 1,
    '3m': 3,
    '6m': 6,
    '1y': 12,
  };
  const months = map[period];
  now.setMonth(now.getMonth() - months);
  return now;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Calculates the current net worth for a user in real time.
 * Reads baseCurrency from the User document; falls back to 'EUR' if user
 * is not found (e.g. during batch snapshots without a full user load).
 *
 * The result is cached in Redis for {@link NET_WORTH_CACHE_TTL_SECONDS}
 * seconds. The cache is best-effort: any Redis error is logged and the
 * calculation falls back to hitting MongoDB directly.
 */
export async function getNetWorth(userId: string): Promise<NetWorthSummary> {
  const cacheKey = netWorthCacheKey(userId);

  // Try the cache first — skip on any Redis error so we never block the user.
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as NetWorthSummary;
    }
  } catch (err) {
    logger.warn({ err, userId }, 'Net-worth cache read failed');
  }

  // Fetch base currency first — needed to convert all account/holding amounts.
  let currency = 'EUR';
  try {
    const { UserModel } = await import('../users/user.model.js');
    const user = await UserModel.findById(userId).select('baseCurrency').lean().exec();
    if (user !== null && user.baseCurrency) {
      currency = user.baseCurrency;
    }
  } catch {
    // Non-critical — leave default currency
  }

  // Fetch exchange rates once for all conversions (cached in Redis).
  let rates: ExchangeRates = { [currency]: 1 };
  try {
    rates = await getRates(currency);
  } catch (err) {
    logger.warn({ err, currency }, 'Failed to fetch exchange rates; values may be unconverted');
  }

  const [accounts, holdings] = await Promise.all([
    AccountModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
      includedInNetWorth: true,
    })
      .select('type currentBalance currency')
      .lean()
      .exec(),
    (async () => {
      try {
        const { getUserHoldings } = await import('../holdings/holding.service.js');
        return await getUserHoldings(userId);
      } catch {
        return [];
      }
    })(),
  ]);

  const breakdown: INetWorthBreakdown = {
    cash: 0,
    investments: 0,
    realEstate: 0,
    vehicles: 0,
    debts: 0,
  };

  let assets = 0;
  let liabilities = 0;

  for (const account of accounts) {
    const bucket = bucketForType(account.type);
    if (bucket === null) continue;

    const accountCurrency = (account as any).currency ?? currency;
    const balanceInBase = convertWithRates(account.currentBalance, accountCurrency, currency, rates);

    if (bucket === 'debts') {
      liabilities += balanceInBase;
      breakdown.debts += balanceInBase;
    } else {
      assets += balanceInBase;
      breakdown[bucket] += balanceInBase;
    }
  }

  for (const holding of holdings as any[]) {
    const bucket = bucketForType(holding.assetType);
    if (bucket === null) continue;
    const holdingCurrency = holding.currency ?? currency;
    const valueInBase = convertWithRates(holding.currentValue, holdingCurrency, currency, rates);
    assets += valueInBase;
    breakdown[bucket] += valueInBase;
  }

  const summary: NetWorthSummary = {
    total: assets - liabilities,
    assets,
    liabilities,
    breakdown,
    currency,
  };

  // Fire-and-forget cache write; never blocks the response path.
  try {
    const redis = getRedisClient();
    await redis.setex(
      cacheKey,
      NET_WORTH_CACHE_TTL_SECONDS,
      JSON.stringify(summary),
    );
  } catch (err) {
    logger.warn({ err, userId }, 'Net-worth cache write failed');
  }

  return summary;
}

/**
 * Invalidates the cached net worth for the given user. Call this whenever a
 * balance-mutating event happens (transaction create/update/delete, account
 * balance adjustment, holding price refresh that affects currentBalance).
 */
export async function invalidateNetWorthCache(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(netWorthCacheKey(userId));
  } catch (err) {
    logger.warn({ err, userId }, 'Net-worth cache invalidation failed');
  }
}

/**
 * Returns historical net worth snapshots for the given period.
 */
export async function getNetWorthHistory(
  userId: string,
  period: NetWorthPeriod,
): Promise<NetWorthPoint[]> {
  const dateFilter: mongoose.FilterQuery<typeof NetWorthSnapshotModel> = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  const start = periodStartDate(period);
  if (start !== null) {
    dateFilter['date'] = { $gte: start };
  }

  const snapshots = await NetWorthSnapshotModel.find(dateFilter)
    .sort({ date: 1 })
    .lean()
    .exec();

  return snapshots.map((s) => ({
    date: (s.date as Date).toISOString(),
    total: s.totalInBaseCurrency,
    breakdown: s.breakdown as INetWorthBreakdown,
  }));
}

/**
 * Returns monthly cashflow (income, expenses, net) for the last `months` months.
 */
export async function getCashflow(
  userId: string,
  months: number,
): Promise<CashflowMonth[]> {
  const raw = await repoCashflow(userId, months);
  return raw.map((r) => ({
    month: r.month,
    income: r.income,
    expenses: r.expenses,
    net: r.income - r.expenses,
  }));
}

/**
 * Returns spending grouped by category for the given date range,
 * enriched with category metadata.
 */
export async function getSpendingByCategory(
  userId: string,
  from: Date,
  to: Date,
): Promise<CategorySpending[]> {
  const rawItems = await repoSpendingByCategory(userId, from, to);
  if (rawItems.length === 0) return [];

  const totalSpend = rawItems.reduce((sum, item) => sum + item.total, 0);

  // Fetch category metadata in a single query
  const categoryIds = rawItems.map(
    (item) => new mongoose.Types.ObjectId(item.categoryId),
  );
  const categories = await CategoryModel.find({ _id: { $in: categoryIds } })
    .select('name color icon')
    .lean()
    .exec();

  const catMap = new Map(
    categories.map((c) => [c._id.toHexString(), c]),
  );

  const result: CategorySpending[] = rawItems
    .map((item) => {
      const cat = catMap.get(item.categoryId);
      return {
        categoryId: item.categoryId,
        name: cat?.name ?? 'Unknown',
        color: cat?.color ?? '#888888',
        icon: cat?.icon ?? 'circle',
        total: item.total,
        percentage: totalSpend > 0
          ? Math.round((item.total / totalSpend) * 10000) / 100
          : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return result;
}

/**
 * Returns the top N holdings for a user ordered by current value (descending).
 * Delegates to the Holdings module to compute enriched values.
 */
export async function getTopHoldings(
  userId: string,
  limit: number,
): Promise<unknown[]> {
  const { getUserHoldings } = await import('../holdings/holding.service.js');
  const holdings = await getUserHoldings(userId);
  return holdings
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, limit);
}

/**
 * Returns upcoming recurring transactions within the next `days` days.
 */
export async function getUpcomingRecurring(
  userId: string,
  days: number,
): Promise<ITransaction[]> {
  const today = midnightUTC();
  const until = new Date(today);
  until.setUTCDate(until.getUTCDate() + days);

  return TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    'recurring.nextDate': { $gte: today, $lte: until },
  })
    .sort({ 'recurring.nextDate': 1 })
    .exec();
}

/**
 * Calculates net worth and upserts a snapshot for today (midnight UTC).
 */
export async function takeNetWorthSnapshot(userId: string): Promise<void> {
  const summary = await getNetWorth(userId);
  const today = midnightUTC();

  await NetWorthSnapshotModel.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
    },
    {
      $set: {
        userId: new mongoose.Types.ObjectId(userId),
        date: today,
        totalInBaseCurrency: summary.total,
        breakdown: summary.breakdown,
      },
    },
    { upsert: true, new: true, runValidators: true },
  ).exec();
}

/**
 * Takes snapshots for all users who have at least one active account.
 */
export async function takeSnapshotsForAllUsers(): Promise<{
  success: number;
  errors: number;
}> {
  const userIds = await AccountModel.distinct('userId', {
    isActive: true,
  }).exec() as mongoose.Types.ObjectId[];

  let success = 0;
  let errors = 0;

  for (const userId of userIds) {
    try {
      await takeNetWorthSnapshot(userId.toHexString());
      success++;
    } catch (err) {
      errors++;
      logger.error(
        { err, userId: userId.toHexString() },
        'Failed to take net worth snapshot for user',
      );
    }
  }

  return { success, errors };
}
