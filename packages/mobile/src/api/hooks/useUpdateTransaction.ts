/**
 * useUpdateTransaction — PATCH /transactions/:id
 *
 * Optimistic flow:
 *  1. Snapshot current cache for rollback.
 *  2. Apply patch to all matching pages optimistically.
 *  3. Send PATCH request.
 *  3a. Success: invalidate queries to refetch fresh data.
 *  3b. Error: rollback and rethrow.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Transaction, UpdateTransactionPayload } from '../../schemas/transaction.schemas';
import { apiClient } from '../client';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';
import { TRANSACTIONS_KEY } from './useTransactions';

// ─── Cache shape ──────────────────────────────────────────────────────────────

interface PageData {
  data: Transaction[];
  nextCursor?: string | null;
  total?: number;
}

interface InfiniteData {
  pages: PageData[];
  pageParams: unknown[];
}

function patchInCache(
  cache: InfiniteData | undefined,
  id: string,
  patch: Partial<Transaction>,
): InfiniteData | undefined {
  if (!cache) return undefined;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.map((tx) =>
        tx.id === id ? { ...tx, ...patch } : tx,
      ),
    })),
  };
}

// ─── Input types ──────────────────────────────────────────────────────────────

interface UpdateInput {
  id: string;
  payload: UpdateTransactionPayload;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUpdateTransaction(): {
  updateTransaction: (id: string, payload: UpdateTransactionPayload) => Promise<Transaction>;
  isPending: boolean;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<Transaction, Error, UpdateInput>({
    mutationFn: async ({ id, payload }) => {
      // Snapshot for rollback
      const snapshots = new Map<readonly unknown[], InfiniteData | undefined>();
      queryClient.getQueriesData<InfiniteData>({ queryKey: TRANSACTIONS_KEY }).forEach(
        ([key, data]) => {
          snapshots.set(key, data);
        },
      );

      // Optimistic patch
      const optimisticPatch: Partial<Transaction> = {
        ...(payload.type !== undefined && { type: payload.type }),
        ...(payload.amount !== undefined && { amount: payload.amount }),
        ...(payload.accountId !== undefined && { accountId: payload.accountId }),
        ...(payload.categoryId !== undefined && { categoryId: payload.categoryId }),
        ...(payload.date !== undefined && { date: payload.date }),
        ...(payload.note !== undefined && { note: payload.note }),
      };

      queryClient.getQueriesData<InfiniteData>({ queryKey: TRANSACTIONS_KEY }).forEach(
        ([key]) => {
          queryClient.setQueryData<InfiniteData>(key, (old) =>
            patchInCache(old, id, optimisticPatch),
          );
        },
      );

      try {
        const response = await apiClient.patch<Transaction>(
          `/transactions/${id}`,
          payload,
        );

        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
        void queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });

        return response.data;
      } catch (err) {
        // Rollback
        snapshots.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
        throw err;
      }
    },
  });

  const updateTransaction = (
    id: string,
    payload: UpdateTransactionPayload,
  ): Promise<Transaction> => mutation.mutateAsync({ id, payload });

  return { updateTransaction, isPending: mutation.isPending };
}
