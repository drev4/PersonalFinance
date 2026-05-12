import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import { createWrapper } from '../../test/utils';
import { useRegister, useLogin, useLogout, useMe } from '../useAuth';

vi.mock('../../lib/i18n', () => ({
  default: { language: 'es', changeLanguage: vi.fn() },
}));

function getAuthStore(): ReturnType<typeof useAuthStore.getState> {
  return useAuthStore.getState();
}

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
});

describe('useRegister', () => {
  it('returns a mutation function', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });

    expect(typeof result.current.mutate).toBe('function');
  });

  it('registers successfully and returns user + token', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRegister(), { wrapper: Wrapper });

    result.current.mutate({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.user.email).toBe('test@example.com');
    expect(result.current.data?.accessToken).toBe('mock-access-token');
  });
});

describe('useLogin', () => {
  it('sets auth state on successful login', async () => {
    const { Wrapper } = createWrapper();
    const onRequiresTwoFactor = vi.fn();
    const { result } = renderHook(() => useLogin(onRequiresTwoFactor), { wrapper: Wrapper });

    result.current.mutate({ email: 'test@example.com', password: 'password123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const store = getAuthStore();
    expect(store.isAuthenticated).toBe(true);
    expect(store.accessToken).toBe('mock-access-token');
    expect(store.user?.email).toBe('test@example.com');
  });

  it('does not call onRequiresTwoFactor when 2FA is not required', async () => {
    const { Wrapper } = createWrapper();
    const onRequiresTwoFactor = vi.fn();
    const { result } = renderHook(() => useLogin(onRequiresTwoFactor), { wrapper: Wrapper });

    result.current.mutate({ email: 'test@example.com', password: 'password123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onRequiresTwoFactor).not.toHaveBeenCalled();
  });
});

describe('useLogout', () => {
  it('clears auth state after logout', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        baseCurrency: 'EUR',
        role: 'user',
        emailVerified: true,
        twoFactorEnabled: false,
        preferences: { locale: 'es', theme: 'light', dashboardWidgets: [] },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      accessToken: 'mock-access-token',
      isAuthenticated: true,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLogout(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const store = getAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.accessToken).toBeNull();
    expect(store.user).toBeNull();
  });
});

describe('useMe', () => {
  it('fetches current user when authenticated', async () => {
    useAuthStore.setState({ accessToken: 'mock-access-token', isAuthenticated: true });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMe(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.email).toBe('test@example.com');
  });

  it('does not fetch when not authenticated', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMe(), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
