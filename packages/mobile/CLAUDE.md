# @finanzas/mobile — App React Native / Expo

## Stack

Expo 54 · React Native 0.81 · Expo Router 6 · TanStack Query 5 · Zustand 5 · Axios · NativeWind (Tailwind) · lucide-react-native · expo-secure-store · expo-notifications

## Arranque

```bash
pnpm start        # Metro bundler
pnpm ios          # Simulador iOS
pnpm android      # Emulador Android
pnpm typecheck
```

`EXPO_PUBLIC_API_URL` en `.env` (default: `http://localhost:3001`)

## Estructura

```
app/                    # Expo Router — sistema de archivos como rutas
├── _layout.tsx         # Root layout: auth guard, QueryClientProvider
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
├── (app)/
│   └── _layout.tsx     # Tab navigator (autenticado)
└── (modals)/
    ├── _layout.tsx
    └── quick-add.tsx   # Modal de añadir transacción rápida

src/
├── api/                # Funciones HTTP por dominio
│   ├── client.ts       # Instancia Axios con interceptor de refresh
│   ├── auth.ts
│   ├── accounts.ts
│   ├── budgets.ts
│   ├── dashboard.ts    # incluye useHealthScore (score 0-100 de salud financiera)
│   ├── goals.ts        # incluye depositGoal(id, amount)
│   ├── holdings.ts
│   ├── integrations.ts
│   ├── notifications.ts
│   ├── transactions.ts / transactions.api.ts
│   ├── user.ts
│   └── health.ts
├── stores/             # Zustand stores
│   ├── authStore.ts        # Usuario + tokens (SecureStore)
│   ├── configStore.ts      # URL del API, preferencias
│   ├── connectivityStore.ts # Estado online/offline
│   └── notificationStore.ts
├── components/
│   ├── TransactionRow.tsx
│   ├── QuickAddModal.tsx
│   ├── EditTransactionModal.tsx
│   ├── DatePickerCalendar.tsx
│   ├── OfflineBanner.tsx
│   └── Skeleton.tsx
├── lib/
│   ├── formatters.ts      # Formateo de moneda y fechas
│   ├── queryClient.ts     # TanStack Query config
│   ├── queryPersister.ts  # Persistencia offline del cache
│   ├── useNotificationSetup.ts
│   └── useOfflineQuery.ts
├── constants/
│   └── theme.ts           # Colores, tipografía
└── theme/
    ├── index.ts
    └── useTheme.ts        # Hook de tema claro/oscuro
```

## Cliente HTTP (`src/api/client.ts`)

- Base URL: `EXPO_PUBLIC_API_URL`
- Header `X-Client-Type: mobile` en todas las peticiones
- Adjunta `Authorization: Bearer <token>` automáticamente
- En 401: hace `POST /auth/refresh` con el `refreshToken` del store
- Tokens guardados en **expo-secure-store** (encriptado en el dispositivo)

## Autenticación (`src/stores/authStore.ts`)

```ts
const { user, accessToken, refreshToken, setTokens, clearAuth } = useAuthStore();
// setTokens(access, refresh) — persiste en SecureStore
// clearAuth() — limpia SecureStore y redirige a login
```

## Offline

- `connectivityStore` monitoriza `@react-native-community/netinfo`
- `useOfflineQuery` — wrapper de TanStack Query con staleTime infinito si offline
- `queryPersister` — persiste el cache en AsyncStorage para uso sin conexión
- `OfflineBanner` — banner visible cuando no hay conexión

## Navegación (Expo Router)

- Rutas basadas en sistema de archivos
- `(auth)` — grupo sin auth
- `(app)` — grupo con auth (Tab navigator)
- `(modals)` — modales presentados sobre cualquier pantalla
- Auth guard en `app/_layout.tsx` — redirige según `authStore`

## Notificaciones Push

- `expo-notifications` para permisos y recepción
- `useNotificationSetup` — registra el device token en `POST /notifications/register-device`
- `notificationStore` — badges, última notificación recibida

## Haptics

```ts
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

Usar en acciones destructivas y confirmaciones.

## Estilos

NativeWind (Tailwind para RN) + theme tokens en `src/constants/theme.ts`.  
Usar `className` de NativeWind como primera opción; `StyleSheet.create` solo si NativeWind no llega.

## Convenciones de API

Los módulos en `src/api/` siguen el mismo contrato que el web:

- Devuelven el campo `data` extraído de `response.data.data`
- Usan el `client` de `src/api/client.ts`

## Añadir una nueva feature al mobile

1. Crear `src/api/<feature>.ts` — funciones que llaman al API
2. Crear la pantalla en `app/(app)/<feature>.tsx` o como tab/modal
3. Reusar componentes de `src/components/` cuando sea posible
4. Si necesitas un hook dedicado, créalo en `src/lib/use<Feature>.ts`
