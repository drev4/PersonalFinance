/**
 * useCreateTransaction
 *
 * Offline-first mutation hook for creating transactions.
 *
 * Flow:
 *  1. Generate a client-side temporary ID (generateClientId).
 *  2. Build an optimistic transaction with status "pending".
 *  3. Inject it into the React Query dashboard cache immediately.
 *  4. Attempt the POST /transactions request.
 *  5a. Online success: remove optimistic entry, inject confirmed entry,
 *      invalidate caches, dequeue from offline queue if present.
 *  5b. Network failure: persist payload in offline queue (MMKV); leave
 *      the optimistic "pending" entry visible in the UI.
 *
 * Re-sync: call retrySyncQueue() when the app regains connectivity.
 * The caller (QuickAdd sheet) provides onSuccess/onError callbacks.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateFrequencyCache } from '../../lib/frequency-calculator';
import { generateClientId } from '../../lib/id-generator';
import {
  dequeueOfflineMutation,
  enqueueOfflineMutation,
  getPendingMutations,
  incrementRetryCount,
} from '../../lib/offline-queue';
import type { CreateTransactionPayload, TransactionFormType } from '../../schemas/transaction.schemas';
import { apiClient } from '../client';
import { DASHBOARD_SUMMARY_KEY, type DashboardTransaction } from './useDashboardSummary';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Optimistic transaction shape stored in React Query cache */
interface OptimisticTransaction extends DashboardTransaction {
  _status: 'pending' | 'confirmed' | 'failed';
  _clientId: string;
}

interface DashboardCacheData {
  recentTransactions?: DashboardTransaction[];
  [key: string]: unknown;
}

/** Returned from useMutation.mutateAsync */
interface CreateTransactionResult {
  clientId: string;
  confirmed: boolean;
}

// ─── Category label map (offline fallback) ────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOptimisticTx(
  payload: CreateTransactionPayload,
): OptimisticTransaction {
  return {
    id: payload.clientId,
    description: payload.note ?? typeLabel(payload.type),
    amount: payload.amount,
    currency: 'EUR',
    type: mapType(payload.type),
    category: payload.categoryId,
    date: payload.date,
    _status: 'pending',
    _clientId: payload.clientId,
  };
}

function typeLabel(type: TransactionFormType): string {
  switch (type) {
    case 'expense': return 'Gasto';
    case 'income': return 'Ingreso';
    case 'transfer': return 'Transferencia';
  }
}

function mapType(
  type: TransactionFormType,
): 'income' | 'expense' | 'transfer' {
  return type;
}

// ─── Optimistic cache helpers ─────────────────────────────────────────────────

function injectOptimisticTx(
  cache: DashboardCacheData,
  tx: OptimisticTransaction,
): DashboardCacheData {
  const current = cache.recentTransactions ?? [];
  return {
    ...cache,
    recentTransactions: [tx, ...current].slice(0, 20),
  };
}

function removeOptimisticTx(
  cache: DashboardCacheData,
  clientId: string,
): DashboardCacheData {
  return {
    ...cache,
    recentTransactions: (cache.recentTransactions ?? []).filter(
      (t) => (t as OptimisticTransaction)._clientId !== clientId,
    ),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateTransaction(): {
  createTransaction: (payload: Omit<CreateTransactionPayload, 'clientId'>) => Promise<CreateTransactionResult>;
  isPending: boolean;
  retrySyncQueue: () => Promise<void>;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    CreateTransactionResult,
    Error,
    CreateTransactionPayload
  >({
    mutationFn: async (payload) => {
      const clientId = payload.clientId;

      // ── Step 1: Optimistic update ────────────────────────────────────────
      const optimisticTx = buildOptimisticTx(payload);

      queryClient.setQueryData<DashboardCacheData>(
        DASHBOARD_SUMMARY_KEY,
        (old) =>
          old ? injectOptimisticTx(old, optimisticTx) : old,
      );

      // ── Step 2: Network request ──────────────────────────────────────────
      try {
        await apiClient.post<{ id: string }>('/transactions', {
          type: payload.type,
          amount: payload.amount,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          date: payload.date,
          notes: payload.note,
          clientId,
        });

        // ── Step 3a: Success — confirm in cache ───────────────────────────
        queryClient.setQueryData<DashboardCacheData>(
          DASHBOARD_SUMMARY_KEY,
          (old) =>
            old ? removeOptimisticTx(old, clientId) : old,
        );

        // Invalidate to refetch fresh data in background
        void queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });

        // Remove from offline queue if it was there
        dequeueOfflineMutation(clientId);

        // Invalidate frequency cache so next Quick Add reflects new usage
        invalidateFrequencyCache();

        return { clientId, confirmed: true };
      } catch (err) {
        const isNetworkError =
          err instanceof Error &&
          (err.message.includes('Network request failed') ||
            err.message.includes('fetch'));

        if (isNetworkError) {
          // ── Step 3b: Offline — persist to queue ───────────────────────
          enqueueOfflineMutation(clientId, payload as unknown as Record<string, unknown>);
          // Leave optimistic tx as "pending" in cache — do not remove
          return { clientId, confirmed: false };
        }

        // Server error — remove optimistic tx and surface error
        queryClient.setQueryData<DashboardCacheData>(
          DASHBOARD_SUMMARY_KEY,
          (old) =>
            old ? removeOptimisticTx(old, clientId) : old,
        );

        throw err;
      }
    },
  });

  /** Wrap mutateAsync so the caller doesn't need to supply clientId */
  const createTransaction = async (
    payload: Omit<CreateTransactionPayload, 'clientId'>,
  ): Promise<CreateTransactionResult> => {
    const clientId = generateClientId();
    return mutation.mutateAsync({ ...payload, clientId });
  };

  /**
   * Retry all offline-queued mutations.
   * Call this from a connectivity listener (e.g. NetInfo) when the app
   * regains network access.
   */
  const retrySyncQueue = async (): Promise<void> => {
    const pending = getPendingMutations();

    for (const queued of pending) {
      const payload = queued.payload as unknown as CreateTransactionPayload;

      try {
        await apiClient.post<{ id: string }>('/transactions', {
          type: payload.type,
          amount: payload.amount,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          date: payload.date,
          notes: payload.note,
          clientId: queued.clientId,
        });

        dequeueOfflineMutation(queued.clientId);

        queryClient.setQueryData<DashboardCacheData>(
          DASHBOARD_SUMMARY_KEY,
          (old) =>
            old ? removeOptimisticTx(old, queued.clientId) : old,
        );

        void queryClient.invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
        invalidateFrequencyCache();
      } catch {
        incrementRetryCount(queued.clientId);
      }
    }
  };

  return {
    createTransaction,
    isPending: mutation.isPending,
    retrySyncQueue,
  };
}
