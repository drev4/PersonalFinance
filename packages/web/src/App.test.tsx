import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Finanzas App')).toBeDefined();
  });

  it('displays coming soon message', () => {
    render(<App />);
    expect(screen.getByText('Coming Soon')).toBeDefined();
  });
});
