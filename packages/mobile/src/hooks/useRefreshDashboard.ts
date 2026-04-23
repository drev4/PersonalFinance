/**
 * useRefreshDashboard — orchestrates pull-to-refresh for the Home screen.
 *
 * - Refetches dashboard summary (blocking — user sees spinner until done).
 * - Fire-and-forgets sync requests for known integration providers.
 *   These never block the main refresh flow; failures are logged only.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { apiClient } from '../api/client';
import { DASHBOARD_SUMMARY_KEY, useDashboardSummary } from '../api/hooks/useDashboardSummary';

// ─── Known integration providers ─────────────────────────────────────────────

const INTEGRATION_PROVIDERS = ['binance', 'degiro', 'coinmarketcap'] as const;
type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

// ─── Fire-and-forget sync ─────────────────────────────────────────────────────

function triggerIntegrationSync(provider: IntegrationProvider): void {
  void apiClient
    .post(`/integrations/${provider}/sync`, {})
    .catch((err: unknown) => {
      // Non-blocking: log and move on
      if (err instanceof Error) {
        console.warn(`[Sync] ${provider} sync failed:`, err.message);
      }
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseRefreshDashboardResult {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function useRefreshDashboard(): UseRefreshDashboardResult {
  const { refetch } = useDashboardSummary();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);

    // Fire-and-forget integration syncs — do not await
    INTEGRATION_PROVIDERS.forEach(triggerIntegrationSync);

    // Invalidate and refetch dashboard data
    void queryClient
      .invalidateQueries({ queryKey: DASHBOARD_SUMMARY_KEY })
      .then(() => {
        refetch();
        setIsRefreshing(false);
      })
      .catch(() => {
        setIsRefreshing(false);
      });
  }, [refetch, queryClient]);

  return { onRefresh, isRefreshing };
}
