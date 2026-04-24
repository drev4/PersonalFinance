/**
 * useUpdateTransactionCategory — PATCH /transactions/:id/category
 *
 * Quick-edit: only changes the category without touching other fields.
 * Optimistic update applied immediately to all paginated cache entries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Transaction } from '../../schemas/transaction.schemas';
import { apiClient } from '../client';
import { DASHBOARD_SUMMARY_KEY } from './useDashboardSummary';
import { TRANSACTIONS_KEY } from './useTransactions';

// ─── Cache helpers ────────────────────────────────────────────────────────────

interface PageData {
  data: Transaction[];
  nextCursor?: string | null;
  total?: number;
}

interface InfiniteData {
  pages: PageData[];
  pageParams: unknown[];
}

function patchCategoryInCache(
  cache: InfiniteData | undefined,
  id: string,
  categoryId: string,
  categoryName?: string,
  categoryColor?: string,
): InfiniteData | undefined {
  if (!cache) return undefined;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      data: page.data.map((tx) =>
        tx.id === id
          ? { ...tx, categoryId, categoryName, categoryColor }
          : tx,
      ),
    })),
  };
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface UpdateCategoryInput {
  transactionId: string;
  categoryId: string;
  categoryName?: string;
  categoryColor?: string;
}

interface UpdateCategoryResponse {
  id: string;
  categoryId: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUpdateTransactionCategory(): {
  updateCategory: (input: UpdateCategoryInput) => Promise<void>;
  isPending: boolean;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, UpdateCategoryInput>({
    mutationFn: async ({ transactionId, categoryId, categoryName, categoryColor }) => {
      // Snapshot for rollback
      const snapshots = new Map<readonly unknown[], InfiniteData | undefined>();
      queryClient.getQueriesData<InfiniteData>({ queryKey: TRANSACTIONS_KEY }).forEach(
        ([key, data]) => {
          snapshots.set(key, data);
        },
      );

      // Optimistic update
      queryClient.getQueriesData<InfiniteData>({ queryKey: TRANSACTIONS_KEY }).forEach(
        ([key]) => {
          queryClient.setQueryData<InfiniteData>(key, (old) =>
            patchCategoryInCache(old, transactionId, categoryId, categoryName, categoryColor),
          );
        },
      );

      try {
        await apiClient.patch<UpdateCategoryResponse>(
          `/transactions/${transactionId}/category`,
          { categoryId },
        );

        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
        void queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
      } catch (err) {
        // Rollback on error
        snapshots.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
        throw err;
      }
    },
  });

  const updateCategory = (input: UpdateCategoryInput): Promise<void> =>
    mutation.mutateAsync(input);

  return { updateCategory, isPending: mutation.isPending };
}
