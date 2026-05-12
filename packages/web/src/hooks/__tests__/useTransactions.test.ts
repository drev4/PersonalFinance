import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createWrapper } from '../../test/utils';
import {
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactionTags,
} from '../useTransactions';

vi.mock('../../stores/authStore', () => {
  const state = { accessToken: 'mock-token', isAuthenticated: true };
  const useAuthStore = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn() },
  );
  return { useAuthStore };
});

describe('useTransactions', () => {
  it('fetches transactions list', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTransactions({ page: 1, limit: 20 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].description).toBe('Supermercado');
  });

  it('returns paginated metadata', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTransactions({ page: 1, limit: 20 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.totalPages).toBe(1);
  });
});

describe('useCreateTransaction', () => {
  it('creates a transaction and returns the new record', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: Wrapper });

    result.current.mutate({
      type: 'expense',
      amount: 100,
      currency: 'EUR',
      description: 'Nueva transacción',
      date: '2026-05-12',
      accountId: 'acc-1',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('tx-new');
    expect(result.current.data?.amount).toBe(100);
  });
});

describe('useDeleteTransaction', () => {
  it('calls delete without error', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper: Wrapper });

    result.current.mutate('tx-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useTransactionTags', () => {
  it('fetches available tags', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTransactionTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toContain('supermercado');
    expect(result.current.data).toContain('restaurante');
  });
});
