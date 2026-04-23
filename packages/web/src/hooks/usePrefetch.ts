import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getAccounts } from '../api/accounts.api';
import { getTransactions } from '../api/transactions.api';
import { accountKeys } from './useAccounts';
import { transactionKeys } from './useTransactions';

const PREFETCH_STALE_TIME = 1000 * 60 * 5; // 5 minutes

/**
 * Returns a stable callback that prefetches the accounts list.
 * Attach it to the `onMouseEnter` of the Accounts nav link so the data is
 * ready by the time the user clicks.
 */
export function usePrefetchAccounts(): () => void {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: accountKeys.lists(),
      queryFn: getAccounts,
      staleTime: PREFETCH_STALE_TIME,
    });
  }, [queryClient]);
}

/**
 * Returns a stable callback that prefetches the most recent transactions page.
 * Attach it to the `onMouseEnter` of the Transactions nav link.
 */
export function usePrefetchTransactions(): () => void {
  const queryClient = useQueryClient();

  const defaultFilters = { page: 1, limit: 20 } as const;

  return useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: transactionKeys.list(defaultFilters),
      queryFn: () => getTransactions(defaultFilters),
      staleTime: PREFETCH_STALE_TIME,
    });
  }, [queryClient]);
}
