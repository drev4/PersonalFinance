/**
 * frequency-calculator.ts
 *
 * Analyses recent transactions to rank accounts and categories by usage
 * frequency. Results are cached in MMKV for 24 hours to avoid recalculation
 * on every sheet open.
 *
 * Cache invalidation:
 *   - Automatic TTL: 24 hours
 *   - Manual: call invalidateFrequencyCache() after creating a transaction
 */

import { storage } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FrequencyItem {
  id: string;
  count: number;
}

export interface FrequencyResult {
  accounts: FrequencyItem[];
  categories: FrequencyItem[];
  computedAt: number;
}

/** Minimal shape the calculator needs from a transaction record */
export interface TransactionRecord {
  accountId: string;
  categoryId?: string | null;
  type: 'income' | 'expense' | 'transfer';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = 'frequency_result_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ANALYSIS_WINDOW = 90; // last 90 transactions

// ─── Cache helpers ────────────────────────────────────────────────────────────

function readCache(): FrequencyResult | null {
  const raw = storage.getString(CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as FrequencyResult;
    const age = Date.now() - parsed.computedAt;
    if (age > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(result: FrequencyResult): void {
  storage.set(CACHE_KEY, JSON.stringify(result));
}

/**
 * Manually invalidate the frequency cache.
 * Call this immediately after a new transaction is created so the
 * next Quick Add open reflects the new usage pattern.
 */
export function invalidateFrequencyCache(): void {
  storage.delete(CACHE_KEY);
}

// ─── Core calculator ──────────────────────────────────────────────────────────

function countFrequency(ids: string[]): FrequencyItem[] {
  const map = new Map<string, number>();

  for (const id of ids) {
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Compute frequency rankings from a list of transactions.
 *
 * @param transactions - Last N transactions, already sorted newest-first.
 * @param forceRefresh - Skip cache and recompute.
 * @returns Accounts and categories sorted by descending usage frequency.
 */
export function computeFrequency(
  transactions: TransactionRecord[],
  forceRefresh = false,
): FrequencyResult {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  const window = transactions.slice(0, ANALYSIS_WINDOW);

  const accountIds = window.map((t) => t.accountId);
  const categoryIds = window
    .map((t) => t.categoryId ?? '')
    .filter(Boolean);

  const result: FrequencyResult = {
    accounts: countFrequency(accountIds),
    categories: countFrequency(categoryIds),
    computedAt: Date.now(),
  };

  writeCache(result);
  return result;
}

/**
 * Filter category frequency list by transaction type.
 * For transfers we return all categories since they span both.
 */
export function filterCategoriesByType(
  categories: FrequencyItem[],
): FrequencyItem[] {
  // Without type metadata stored in frequency items we return all and
  // let the consumer filter by their own category list.
  return categories;
}
