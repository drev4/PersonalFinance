# @finanzas/web — Frontend React

## Stack

React 18 · Vite 5 · React Router 6 · TanStack Query 5 · Zustand 4 · Axios · Tailwind 3 · Radix UI · Zod 4 · i18next · Recharts · lucide-react

## Arranque

```bash
pnpm dev        # Vite dev server — http://localhost:5173
pnpm build
pnpm typecheck
```

`VITE_API_URL` en `.env` (default: `http://localhost:3001`)

---

## Estructura

```
src/
├── api/           # Funciones HTTP por dominio (una por dominio)
├── hooks/         # TanStack Query hooks (una por dominio)
├── stores/        # Zustand stores
│   ├── authStore.ts       usuario + accessToken + localStorage
│   └── uiStore.ts
├── pages/         # Páginas → carpeta por dominio
│   ├── auth/      login.tsx, register.tsx
│   ├── accounts/
│   ├── transactions/
│   ├── budgets/
│   ├── goals/
│   ├── holdings/
│   ├── simulators/
│   ├── reports/
│   ├── notifications/
│   └── settings/
├── components/    # Componentes reutilizables
│   ├── ui/        # Primitivos: Button, Input, Dialog, Card, Badge…
│   ├── layout/    # AppLayout, Sidebar, Header
│   ├── dashboard/ # NetWorthCard, CashflowChart, HealthScoreWidget…
│   ├── transactions/
│   ├── accounts/
│   ├── budgets/
│   ├── goals/
│   ├── holdings/
│   ├── simulators/
│   ├── reports/
│   ├── notifications/
│   ├── integrations/
│   └── search/    # CommandPalette
├── routes/
│   ├── ProtectedRoute.tsx
│   └── PublicRoute.tsx
├── lib/
│   ├── api.ts         # apiClient Axios con interceptor de refresh
│   ├── queryClient.ts # TanStack Query config
│   ├── formatters.ts  # formatCurrency, formatDate
│   └── i18n.ts        # configuración i18next
├── locales/
│   ├── es/            # Traducciones en español
│   └── en/            # Traducciones en inglés
├── types/
│   └── api.ts         # Tipos de respuesta del API
└── utils/
```

---

## Arquitectura de capas (obligatorio)

```
Componente / Página
       ↓
   Hook (TanStack Query)
       ↓
  api/<dominio>.api.ts
       ↓
   apiClient (Axios)
```

**Nunca** llamar Axios directamente desde un componente o página. Siempre a través del hook correspondiente.

### Capa API (`src/api/<dominio>.api.ts`)

Funciones async puras que llaman al API y devuelven datos (no la respuesta Axios completa):

```ts
// src/api/transactions.api.ts
export async function getTransactions(filters: TransactionFilters) {
  const res = await apiClient.get<{ data: PaginatedResponse<Transaction> }>('/transactions', {
    params: filters,
  });
  return res.data.data;
}

export async function createTransaction(dto: CreateTransactionDto) {
  const res = await apiClient.post<{ data: Transaction }>('/transactions', dto);
  return res.data.data;
}
```

### Capa Hook (`src/hooks/use<Dominio>.ts`)

Envuelve las funciones de API con TanStack Query. Define query keys con factory:

```ts
// src/hooks/useTransactions.ts
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (f: TransactionFilters) => [...transactionKeys.all, 'list', f] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
};

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => getTransactions(filters),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}
```

---

## Cliente HTTP (`src/lib/api.ts`)

- Base URL: `VITE_API_URL`
- Adjunta `Authorization: Bearer <token>` automáticamente desde `authStore`
- En 401: refresca token via `POST /auth/refresh` (cookie httpOnly), encola peticiones fallidas
- `withCredentials: true` para la cookie del refresh token

---

## Autenticación

```ts
const { user, accessToken, setAuth, clearAuth } = useAuthStore();
// setAuth(user, token) — guarda en Zustand + localStorage
// clearAuth() — limpia y redirige a /login
// user.baseCurrency — para conversión de moneda
```

Rutas protegidas con `ProtectedRoute` en `src/routes/`. Auth guard redirige a `/login` si no hay token.

---

## Hooks disponibles

| Hook                   | Archivo                     | Qué hace                                          |
| ---------------------- | --------------------------- | ------------------------------------------------- |
| `useAuth`              | `hooks/useAuth.ts`          | Login, register, logout, usuario actual           |
| `useAccounts`          | `hooks/useAccounts.ts`      | CRUD de cuentas, net worth                        |
| `useTransactions`      | `hooks/useTransactions.ts`  | Lista, crea, edita, elimina transacciones         |
| `useCategories`        | `hooks/useCategories.ts`    | CRUD de categorías                                |
| `useBudgets`           | `hooks/useBudgets.ts`       | CRUD, progreso, alertas                           |
| `useGoals`             | `hooks/useGoals.ts`         | CRUD + `useDepositGoal` mutation                  |
| `useHoldings`          | `hooks/useHoldings.ts`      | Portfolio, búsqueda tickers, import CSV           |
| `useIntegrations`      | `hooks/useIntegrations.ts`  | Conectar/desconectar Binance                      |
| `useSimulators`        | `hooks/useSimulators.ts`    | Calculadoras + simulaciones guardadas             |
| `useNotifications`     | `hooks/useNotifications.ts` | Lista, marcar leídas, eliminar                    |
| `useReports`           | `hooks/useReports.ts`       | Descargar PDF/CSV                                 |
| `useDashboard`         | `hooks/useDashboard.ts`     | Net worth, cashflow, spending, upcoming recurring |
| `useHealthScore`       | `hooks/useDashboard.ts`     | Score 0-100 con desglose por área                 |
| `useCurrencyRates`     | `hooks/useCurrency.ts`      | Tipos de cambio (1h cache)                        |
| `useCurrencyConverter` | `hooks/useCurrency.ts`      | `convert(amount, from, to): number \| null`       |

---

## Componentes UI (`src/components/ui/`)

Primitivos construidos sobre Radix UI + Tailwind. Disponibles:
`Button` · `Input` · `Label` · `Card` · `Dialog` · `Select` · `Combobox` · `Badge` · `Progress` · `Skeleton` · `Switch` · `Table` · `Tabs` · `Tooltip` · `Alert` · `EmptyState`

Usar siempre estos primitivos en lugar de HTML nativo cuando exista el equivalente.

---

## Estilos

Tailwind 3 con `clsx` + `tailwind-merge` para clases condicionales:

```ts
import { cn } from '../lib/utils'; // clsx + twMerge
<div className={cn('base-class', condition && 'conditional-class')} />;
```

No usar `style={{}}` inline salvo para valores dinámicos que Tailwind no puede generar.

---

## i18n

```ts
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// t('transactions.title'), t('common.save')
```

Traducciones en `src/locales/es/` y `src/locales/en/`. Todo texto visible al usuario debe pasar por `t()`.

---

## Formateo de moneda y fechas

```ts
import { formatCurrency, formatDate } from '../lib/formatters';
formatCurrency(1999, 'EUR'); // → "19,99 €"
formatDate('2024-01-15'); // → "15 ene 2024"
```

`amount` en centavos (integer). Nunca formatear manualmente con division por 100.

---

## Conversión de moneda

```ts
const { convert, baseCurrency, isLoading } = useCurrencyConverter();
convert(amount, 'USD', 'EUR'); // → number | null
```

Los rates se cachean 1h en TanStack Query (mismo TTL que Redis).

---

## Directrices de código limpio

### Componentes

- Una página = un fichero de página en `src/pages/`. Extraer subcomponentes a `src/components/<dominio>/`.
- Props tipadas siempre con `interface Props { ... }` explícita.
- Separar la lógica del componente del JSX. Si el cuerpo del componente supera 200 líneas, dividir.
- No usar `useEffect` para cargar datos remotos. Usar hooks TanStack Query.

### Formularios

Usar `react-hook-form` + `@hookform/resolvers/zod` + schema Zod de `@finanzas/shared`:

```ts
const schema = CreateTransactionSchema;
const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
```

### Estado global vs local

- Estado de UI efímero (modal abierto, tab activo) → `useState` local.
- Datos del servidor → TanStack Query (nunca duplicar en Zustand).
- Estado compartido entre rutas (usuario, preferencias) → Zustand store.

### Carga y errores

Siempre manejar los tres estados: loading, error, data:

```tsx
const { data, isLoading, error } = useTransactions(filters);
if (isLoading) return <Skeleton />;
if (error) return <Alert variant="error">{error.message}</Alert>;
return <TransactionList items={data.items} />;
```

### Páginas nuevas

1. Crear `src/api/<feature>.api.ts`
2. Crear `src/hooks/use<Feature>.ts`
3. Crear `src/pages/<feature>/index.tsx` (y subcomponentes en `src/components/<feature>/`)
4. Añadir ruta en `src/App.tsx`
