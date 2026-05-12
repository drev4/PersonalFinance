import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createWrapper } from '../../test/utils';
import {
  useNetWorthSummary,
  useDashboardCashflow,
  useHealthScore,
  useUpcomingRecurring,
} from '../useDashboard';

vi.mock('../../stores/authStore', () => {
  const state = { accessToken: 'mock-token', isAuthenticated: true };
  const useAuthStore = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn() },
  );
  return { useAuthStore };
});

describe('useNetWorthSummary', () => {
  it('fetches net worth data', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNetWorthSummary(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.netWorth).toBe(15000);
    expect(result.current.data?.totalAssets).toBe(20000);
    expect(result.current.data?.totalLiabilities).toBe(5000);
  });

  it('computes net worth as assets minus liabilities', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNetWorthSummary(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { totalAssets, totalLiabilities, netWorth } = result.current.data!;
    expect(netWorth).toBe(totalAssets - totalLiabilities);
  });
});

describe('useDashboardCashflow', () => {
  it('fetches cashflow for given months', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDashboardCashflow(2), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].income).toBe(3000);
    expect(result.current.data?.[1].income).toBe(3200);
  });
});

describe('useHealthScore', () => {
  it('fetches health score', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useHealthScore(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.score).toBe(72);
  });
});

describe('useUpcomingRecurring', () => {
  it('fetches upcoming recurring transactions', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpcomingRecurring(30), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
