import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./lib/i18n', () => ({ default: { language: 'es', changeLanguage: vi.fn() } }));
vi.mock('./stores/authStore', () => {
  const state = { accessToken: null, isAuthenticated: false, user: null };
  const useAuthStore = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState: () => state, setState: vi.fn() },
  );
  return { useAuthStore };
});

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<div data-testid="app-root">App</div>);
    expect(screen.getByTestId('app-root')).toBeDefined();
    expect(container).toBeTruthy();
  });
});
