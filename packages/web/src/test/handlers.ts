import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3001';

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/register`, () =>
    HttpResponse.json({
      data: {
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
      },
    }),
  ),

  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      data: {
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
      },
    }),
  ),

  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({ data: null })),

  http.get(`${BASE}/users/me`, () =>
    HttpResponse.json({
      data: {
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
      },
    }),
  ),

  // Transactions
  http.get(`${BASE}/transactions`, () =>
    HttpResponse.json({
      data: {
        data: [
          {
            id: 'tx-1',
            type: 'expense',
            amount: 50,
            currency: 'EUR',
            description: 'Supermercado',
            date: '2026-05-01T10:00:00Z',
            accountId: 'acc-1',
            categoryId: 'cat-1',
            tags: [],
            createdAt: '2026-05-01T10:00:00Z',
            updatedAt: '2026-05-01T10:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    }),
  ),

  http.post(`${BASE}/transactions`, () =>
    HttpResponse.json({
      data: {
        id: 'tx-new',
        type: 'expense',
        amount: 100,
        currency: 'EUR',
        description: 'Nueva transacción',
        date: '2026-05-12T10:00:00Z',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        tags: [],
        createdAt: '2026-05-12T10:00:00Z',
        updatedAt: '2026-05-12T10:00:00Z',
      },
    }),
  ),

  http.delete(`${BASE}/transactions/:id`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${BASE}/transactions/tags`, () =>
    HttpResponse.json({ data: ['supermercado', 'restaurante'] }),
  ),

  // Dashboard
  http.get(`${BASE}/dashboard/net-worth`, () =>
    HttpResponse.json({
      data: {
        netWorth: 15000,
        totalAssets: 20000,
        totalLiabilities: 5000,
        accounts: [],
        changeAmount: 500,
        changePercent: 3.45,
      },
    }),
  ),

  http.get(`${BASE}/dashboard/cashflow`, () =>
    HttpResponse.json({
      data: [
        { month: '2026-04', income: 3000, expenses: 2000 },
        { month: '2026-05', income: 3200, expenses: 1800 },
      ],
    }),
  ),

  http.get(`${BASE}/dashboard/health-score`, () =>
    HttpResponse.json({
      data: {
        score: 72,
        areas: [],
        updatedAt: '2026-05-12T00:00:00Z',
      },
    }),
  ),

  http.get(`${BASE}/dashboard/upcoming-recurring`, () => HttpResponse.json({ data: [] })),

  http.get(`${BASE}/dashboard/net-worth/history`, () => HttpResponse.json({ data: [] })),

  http.get(`${BASE}/dashboard/spending-by-category`, () => HttpResponse.json({ data: [] })),

  // Token refresh (response interceptor fallback)
  http.post(`${BASE}/auth/refresh`, () =>
    HttpResponse.json({ data: { accessToken: 'refreshed-mock-token' } }),
  ),
];
