/**
 * useDeleteTransaction — DELETE /transactions/:id
 *
 * Optimistic flow:
 *  1. Remove transaction from all paginated cache pages.
 *  2. Call DELETE /transactions/:id.
 *  3a. Success: invalidate all transaction + dashboard queries.
 *  3b. Error: rollback cache to pre-delete snapshot.
 *
 * Offline: enqueues deletion in offline queue when network is absent.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  dequeueOfflineMutation,
  enqueueOfflineMutation,
} from '../../lib/offline-queue';
import type { Transaction } from '../../schemas/transaction.schemas';
import { apiClient } from '../client';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';
import { TRANSACTIONS_KEY } from './useTransactions';

// ─── Cache shape helpers ──────────────────────────────────────────────────────

interface PageData {
  data: Transaction[];
  nextCursor?: string | null;
  total?: number;
}

interface InfiniteData {
  pages: PageData[];
  pageParams: unknown[];
}

function removeFromCache(
  cache: InfiniteData | undefined,
  id: string,
): InfiniteData | undefined {
  if (!cache) return undefined;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.filter((tx) => tx.id !== id),
      total: page.total !== undefined ? Math.max(0, page.total - 1) : undefined,
    })),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface DeleteTransactionResult {
  id: string;
  confirmed: boolean;
}

export function useDeleteTransaction(): {
  deleteTransaction: (id: string) => Promise<DeleteTransactionResult>;
  isPending: boolean;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<DeleteTransactionResult, Error, string>({
    mutationFn: async (id) => {
      // ── Step 1: Snapshot current cache for rollback ────────────────────────
      const snapshots = new Map<readonly unknown[], InfiniteData | undefined>();

      queryClient.getQueriesData<InfiniteData>({ queryKey: TRANSACTIONS_KEY }).forEach(
        ([key, data]) => {
          snapshots.set(key, data);
        },
      );

      // ── Step 2: Optimistic removal from all pages ─────────────────────────
      queryClient.getQueriesData<InfiniteData>({ queryKey: TRANSACTIONS_KEY }).forEach(
        ([key]) => {
          queryClient.setQueryData<InfiniteData>(key, (old) =>
            removeFromCache(old, id),
          );
        },
      );

      // ── Step 3: Network request ───────────────────────────────────────────
      try {
        await apiClient.delete<void>(`/transactions/${id}`);

        dequeueOfflineMutation(id);
        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
        void queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });

        return { id, confirmed: true };
      } catch (err) {
        const isNetworkError =
          err instanceof Error &&
          (err.message.includes('Network request failed') ||
            err.message.includes('fetch'));

        if (isNetworkError) {
          // Queue offline deletion — optimistic state already applied
          enqueueOfflineMutation(`del_${id}`, { op: 'delete', id });
          return { id, confirmed: false };
        }

        // Server error — rollback
        snapshots.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });

        throw err;
      }
    },
  });

  const deleteTransaction = (id: string): Promise<DeleteTransactionResult> =>
    mutation.mutateAsync(id);

  return { deleteTransaction, isPending: mutation.isPending };
}
