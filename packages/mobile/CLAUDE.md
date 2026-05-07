# @finanzas/mobile — App React Native / Expo

## Stack

Expo 54 · React Native 0.81 · Expo Router 6 · TanStack Query 5 · Zustand 5 · Axios · NativeWind (Tailwind RN) · lucide-react-native · expo-secure-store · expo-notifications · expo-haptics · expo-local-authentication

## Arranque

```bash
pnpm start      # Metro bundler
pnpm ios        # Simulador iOS
pnpm android    # Emulador Android
pnpm typecheck
```

`EXPO_PUBLIC_API_URL` en `.env` (default: `http://localhost:3001`)

---

## Estructura

```
app/                         # Expo Router — rutas por sistema de ficheros
├── _layout.tsx              # Root layout: QueryClientProvider + auth guard
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
├── (app)/
│   ├── _layout.tsx          # Tab navigator (autenticado)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar con iconos outline, sin labels
│       ├── index.tsx        # Dashboard
│       ├── transactions.tsx
│       ├── accounts.tsx
│       ├── portfolio.tsx
│       ├── budgets.tsx
│       ├── goals.tsx
│       ├── reports.tsx
│       ├── simulators.tsx
│       ├── search.tsx
│       ├── recurring.tsx
│       ├── notifications.tsx
│       ├── settings.tsx
│       └── more.tsx
└── (modals)/
    ├── _layout.tsx
    └── quick-add.tsx        # Modal de añadir transacción rápida

src/
├── api/                     # Funciones HTTP por dominio
│   ├── client.ts            # Axios con interceptor de refresh
│   ├── auth.ts
│   ├── accounts.ts
│   ├── budgets.ts
│   ├── dashboard.ts         # incluye health score (0-100)
│   ├── goals.ts             # incluye depositGoal(id, amount)
│   ├── holdings.ts
│   ├── integrations.ts
│   ├── notifications.ts
│   ├── priceAlerts.ts
│   ├── simulators.ts
│   ├── transactions.ts / transactions.api.ts
│   ├── user.ts
│   └── health.ts
├── stores/                  # Zustand stores
│   ├── authStore.ts         # usuario + tokens (SecureStore)
│   ├── configStore.ts       # URL del API, preferencias
│   ├── connectivityStore.ts # estado online/offline (NetInfo)
│   └── notificationStore.ts # badges, última notificación
├── components/
│   ├── TransactionRow.tsx
│   ├── QuickAddModal.tsx
│   ├── EditTransactionModal.tsx
│   ├── AccountFormModal.tsx
│   ├── BudgetFormModal.tsx
│   ├── GoalFormModal.tsx
│   ├── DatePickerCalendar.tsx
│   ├── OfflineBanner.tsx
│   └── Skeleton.tsx
├── lib/
│   ├── formatters.ts        # formatCurrency, formatDate
│   ├── queryClient.ts       # TanStack Query config
│   ├── queryPersister.ts    # persistencia offline del cache
│   ├── useNotificationSetup.ts
│   └── useOfflineQuery.ts
├── hooks/
│   └── useBiometrics.ts     # expo-local-authentication
└── theme/
    ├── index.ts             # colores light/dark, spacing, radius, typography
    └── useTheme.ts          # hook { colors, typography, radius, spacing, shadow, isDark }
```

---

## Arquitectura de capas (obligatorio)

```
Pantalla / Componente
       ↓
  TanStack Query (useQuery / useMutation)
       ↓
  src/api/<dominio>.ts
       ↓
  src/api/client.ts (Axios)
```

Nunca llamar Axios directamente desde una pantalla o componente. Siempre a través de `src/api/`.

### Capa API (`src/api/<dominio>.ts`)

```ts
// src/api/accounts.ts
export async function getAccounts() {
  const res = await client.get<{ data: Account[] }>('/accounts');
  return res.data.data;
}
```

Los módulos en `src/api/` devuelven el campo `data` ya extraído de `response.data.data`.

---

## Cliente HTTP (`src/api/client.ts`)

- Base URL: `EXPO_PUBLIC_API_URL`
- Header `X-Client-Type: mobile` en todas las peticiones
- `Authorization: Bearer <token>` automático desde `authStore`
- En 401: `POST /auth/refresh` con `refreshToken` del store → actualiza tokens → reintenta
- Tokens guardados en **expo-secure-store** (cifrado en el dispositivo)

---

## Autenticación (`src/stores/authStore.ts`)

```ts
const { user, accessToken, refreshToken, setTokens, clearAuth } = useAuthStore();
// setTokens(access, refresh) — persiste en SecureStore
// clearAuth()               — limpia SecureStore y redirige a login
```

Auth guard en `app/_layout.tsx`: redirige a `/(auth)/login` si no hay `accessToken`.

---

## Tema (`src/theme/`)

### useTheme

```ts
const { colors, typography, radius, spacing, shadow, isDark } = useTheme();
```

### Tokens de color

```ts
// light / dark
colors.bg; // fondo de pantalla: #F5F5F7 / #0F0F10
colors.card; // fondo de card: #FFFFFF / #1C1C1E
colors.primary; // azul: #0052CC / #4A8FFF
colors.income; // verde: #00C896 / #30D158
colors.expense; // rojo: #FF4757 / #FF453A
colors.transfer; // violeta: #8B5CF6 / #BF5AF2
colors.text; // texto principal
colors.textSecondary;
colors.border;
```

### Reglas de estilo

- Usar `useTheme()` para todos los colores. **Nunca hardcodear colores**.
- NativeWind (`className`) como primera opción.
- `StyleSheet.create` solo cuando NativeWind no alcanza (e.g., sombras, valores calculados).
- Radios: `radius.sm` (12) en elementos pequeños, `radius.lg` (20) / `radius.xl` (24) en cards, `radius.full` (100) en botones CTA.

---

## Estilos con NativeWind

```tsx
// Preferido
<View className="flex-1 bg-white rounded-2xl p-4 shadow-sm" />

// Solo cuando NativeWind no llega
<View style={[styles.card, { backgroundColor: colors.card }]} />
```

---

## Navegación (Expo Router)

- Basada en sistema de ficheros bajo `app/`
- `(auth)` — grupo sin autenticación
- `(app)` — grupo autenticado con Tab navigator
- `(modals)` — modales presentados encima de cualquier pantalla
- Navegar con `router.push('/path')` o `<Link href="/path" />`

---

## Offline

- `connectivityStore` monitoriza `@react-native-community/netinfo`
- `useOfflineQuery` — wrapper de TanStack Query con `staleTime: Infinity` si offline
- `queryPersister` — persiste cache en AsyncStorage para uso sin conexión
- `OfflineBanner` — banner visible cuando no hay conexión, siempre incluir en el root layout

---

## Notificaciones Push

```ts
// src/lib/useNotificationSetup.ts
// Llama en el root layout autenticado
useNotificationSetup(); // registra device token en POST /notifications/register-device
```

---

## Haptics

```ts
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // acción normal
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // confirmación
```

Usar en: confirmaciones de acción, acciones destructivas, éxito de formulario.

---

## Formateo

```ts
import { formatCurrency, formatDate } from '@/src/lib/formatters';
formatCurrency(1999, 'EUR'); // → "19,99 €"
formatDate('2024-01-15'); // → "15 ene 2024"
```

`amount` siempre en centavos (integer).

---

## Directrices de código limpio

### Pantallas

- Una pantalla = un fichero en `app/`. Si supera 300 líneas, extraer componentes a `src/components/`.
- No hacer llamadas a la API directamente en pantallas. Usar `useQuery`/`useMutation` con funciones de `src/api/`.
- El estado de UI efímero (modal abierto, filtro seleccionado) va en `useState` local de la pantalla.

### Componentes

- Props tipadas con `interface Props { ... }`.
- Nombrar los handlers como `handlePress`, `handleSubmit`, `handleDelete`.
- Accesibilidad: añadir `accessibilityLabel` en elementos interactivos sin texto visible.

### Modales

Los modales de formulario siguen este patrón:

```tsx
interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  item?: ExistingItem; // si es edición
}
```

### Carga y errores

```tsx
const { data, isLoading, error } = useQuery({ queryKey, queryFn });
if (isLoading) return <Skeleton />;
if (error) return <ErrorView message={error.message} />;
```

### Feature nueva en mobile

1. Crear `src/api/<feature>.ts` — funciones que llaman al API
2. Crear pantalla en `app/(app)/(tabs)/<feature>.tsx` o como modal
3. Reusar componentes de `src/components/`
4. Si necesitas hook dedicado, créalo en `src/lib/use<Feature>.ts`
