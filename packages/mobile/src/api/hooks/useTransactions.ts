/**
 * useTransactions — infinite-scroll paginated list of transactions.
 *
 * - useInfiniteQuery with cursor-based pagination
 * - staleTime: 10 s (transactions change frequently)
 * - Groups results by calendar day on the client
 * - Offline-aware: returns stale cache when no network
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Transaction } from '../../schemas/transaction.schemas';
import { apiClient } from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: 'expense' | 'income' | 'transfer';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
}

export interface TransactionGroup {
  date: string;
  /** ISO date key e.g. "2024-04-14" */
  dateKey: string;
  transactions: Transaction[];
}

interface TransactionPage {
  data: Transaction[];
  nextCursor?: string | null;
  total?: number;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const TRANSACTIONS_KEY = ['transactions'] as const;

export function transactionsQueryKey(
  filters: TransactionFilters,
): readonly unknown[] {
  return [...TRANSACTIONS_KEY, filters] as const;
}

// ─── Date grouping helpers ────────────────────────────────────────────────────

function toDateKey(isoString: string): string {
  // Normalise to local midnight
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function groupTransactionsByDay(transactions: Transaction[]): TransactionGroup[] {
  const map = new Map<string, Transaction[]>();

  // Preserve descending order — newest date first
  for (const tx of transactions) {
    const key = toDateKey(tx.date);
    const existing = map.get(key);
    if (existing) {
      existing.push(tx);
    } else {
      map.set(key, [tx]);
    }
  }

  return Array.from(map.entries()).map(([dateKey, txs]) => ({
    dateKey,
    date: txs[0]?.date ?? dateKey,
    transactions: txs,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseTransactionsResult {
  groups: TransactionGroup[];
  allTransactions: Transaction[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: string | null;
  refetch: () => void;
  total: number;
}

export function useTransactions(
  filters: TransactionFilters = {},
): UseTransactionsResult {
  const limit = filters.limit ?? 20;
  const queryKey = transactionsQueryKey(filters);

  const result = useInfiniteQuery<TransactionPage, Error>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();

      if (filters.accountId) params.set('accountId', filters.accountId);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.type) params.set('type', filters.type);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.search) params.set('search', filters.search);
      params.set('limit', String(limit));

      if (pageParam && typeof pageParam === 'string') {
        params.set('cursor', pageParam);
      }

      const qs = params.toString();
      const path = `/transactions${qs ? `?${qs}` : ''}`;
      const response = await apiClient.get<TransactionPage>(path);
      return response.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10 * 1000, // 10 s — fast revalidation for frequent changes
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  // Flatten all pages and group by day (client-side)
  const { allTransactions, groups } = useMemo(() => {
    const all: Transaction[] = [];
    for (const page of result.data?.pages ?? []) {
      all.push(...page.data);
    }
    const grouped = groupTransactionsByDay(all);
    return { allTransactions: all, groups: grouped };
  }, [result.data?.pages]);

  const total = useMemo(
    () => result.data?.pages[0]?.total ?? allTransactions.length,
    [result.data?.pages, allTransactions.length],
  );

  const fetchNextPage = (): void => {
    void result.fetchNextPage();
  };

  const refetch = (): void => {
    void result.refetch();
  };

  return {
    groups,
    allTransactions,
    fetchNextPage,
    hasNextPage: result.hasNextPage,
    isLoading: result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    error: result.error
      ? (result.error.message ?? 'Error al cargar transacciones')
      : null,
    refetch,
    total,
  };
}

// ─── Query invalidation helper ────────────────────────────────────────────────

export function useInvalidateTransactions(): () => void {
  const queryClient = useQueryClient();
  return (): void => {
    void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
  };
}
