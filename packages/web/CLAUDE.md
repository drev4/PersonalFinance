# @finanzas/web — Frontend React

## Stack

React 18 · Vite 5 · React Router 6 · TanStack Query 5 · Zustand 4 · Axios · Tailwind 3 · Radix UI · Zod 4 · i18next · Recharts

## Arranque

```bash
pnpm dev      # Vite dev server — http://localhost:5173
pnpm build    # build producción
pnpm typecheck
```

`VITE_API_URL` en `.env` apunta al API (default: `http://localhost:3001`)

## Estructura

```
src/
├── api/           # Funciones de llamada HTTP (una por dominio)
├── hooks/         # React Query hooks (una por dominio)
├── stores/        # Zustand stores
├── pages/         # Páginas/rutas
├── components/    # Componentes reutilizables
├── routes/        # ProtectedRoute, PublicRoute
├── lib/
│   ├── api.ts         # apiClient Axios (con interceptor de refresh)
│   ├── queryClient.ts # TanStack Query config
│   ├── formatters.ts  # Formateo de moneda, fechas
│   └── i18n.ts        # Configuración i18next
└── types/api.ts   # Tipos de respuesta del API
```

## Patrón de datos (obligatorio)

Siempre: `api/<dominio>.api.ts` → `hooks/use<Dominio>.ts` → componente

**Nunca** llamar Axios directamente desde un componente o página.

### Ejemplo: currency

```ts
// src/api/currency.api.ts
export async function getCurrencyRates(base: string): Promise<CurrencyRates> {
  const res = await apiClient.get<{ data: CurrencyRates }>('/currency/rates', { params: { base } });
  return res.data.data;
}

// src/hooks/useCurrency.ts
export function useCurrencyRates(base?: string) { ... }
export function useCurrencyConverter() {
  // Devuelve: { convert(amount, from, to): number | null, baseCurrency, isLoading }
}
```

## Cliente HTTP (`src/lib/api.ts`)

- Base URL: `VITE_API_URL`
- Adjunta `Authorization: Bearer <token>` automáticamente
- En 401: refresca token via `POST /auth/refresh` (cookie httpOnly)
- Cola de peticiones fallidas durante refresh para no hacer múltiples refreshes
- `withCredentials: true` (necesario para la cookie del refresh token)

## Autenticación (`src/stores/authStore.ts`)

```ts
const { user, accessToken, setAuth, clearAuth } = useAuthStore();
```

- `setAuth(user, token)` — guarda en Zustand + localStorage
- `clearAuth()` — limpia y redirige a `/login`
- `user.baseCurrency` — moneda base del usuario (para conversión)

## Hooks disponibles

| Hook                   | Archivo                     | Qué hace                                   |
| ---------------------- | --------------------------- | ------------------------------------------ |
| `useAuth`              | `hooks/useAuth.ts`          | Login, register, logout, user actual       |
| `useAccounts`          | `hooks/useAccounts.ts`      | CRUD de cuentas, net worth                 |
| `useTransactions`      | `hooks/useTransactions.ts`  | Lista, crea, edita, elimina transacciones  |
| `useCategories`        | `hooks/useCategories.ts`    | CRUD de categorías                         |
| `useBudgets`           | `hooks/useBudgets.ts`       | CRUD de presupuestos, progreso, alertas    |
| `useGoals`             | `hooks/useGoals.ts`         | CRUD de objetivos de ahorro                |
| `useHoldings`          | `hooks/useHoldings.ts`      | Portfolio, búsqueda de tickers, import CSV |
| `useIntegrations`      | `hooks/useIntegrations.ts`  | Conectar/desconectar Binance               |
| `useSimulators`        | `hooks/useSimulators.ts`    | Calculadoras + simulaciones guardadas      |
| `useNotifications`     | `hooks/useNotifications.ts` | Notificaciones, marcar leídas              |
| `useReports`           | `hooks/useReports.ts`       | Descargar PDF/CSV                          |
| `useDashboard`         | `hooks/useDashboard.ts`     | Net worth, cashflow, spending              |
| `useCurrencyRates`     | `hooks/useCurrency.ts`      | Tipos de cambio (1h cache)                 |
| `useCurrencyConverter` | `hooks/useCurrency.ts`      | `convert(amount, from, to)`                |

## Query Keys

Cada hook define sus propias keys siguiendo el patrón:

```ts
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters) => [...transactionKeys.all, 'list', filters] as const,
  detail: (id) => [...transactionKeys.all, 'detail', id] as const,
};
```

## Conversión de moneda (web)

```ts
const { convert, baseCurrency, isLoading } = useCurrencyConverter();
// convert(amount, 'USD', 'EUR') → number | null
// amount es en la unidad que uses (no necesariamente centavos)
```

Los rates se cachean 1h en TanStack Query (mismo TTL que Redis).

## Rutas

- `/login`, `/register` — públicas (redirigen a `/` si ya autenticado)
- `/*` — protegidas (redirigen a `/login` si no autenticado)
- `ProtectedRoute` en `src/routes/ProtectedRoute.tsx`
- `PublicRoute` en `src/routes/PublicRoute.tsx`

## i18n

- `src/lib/i18n.ts` — configuración i18next con detección de idioma del browser
- Usar `useTranslation()` hook de `react-i18next` en componentes

## Formateo

```ts
import { formatCurrency, formatDate } from '../lib/formatters';
// formatCurrency(amountCents, 'EUR') → "19,99 €"
```

## Añadir una nueva feature al web

1. Crear `src/api/<feature>.api.ts` — funciones que llaman al API
2. Crear `src/hooks/use<Feature>.ts` — hooks TanStack Query
3. Crear páginas/componentes en `src/pages/` o `src/components/`
4. Añadir rutas en `src/App.tsx`
