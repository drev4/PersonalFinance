# Finanzas App — Monorepo Context

## Arquitectura

pnpm monorepo con 4 paquetes:

| Paquete           | Nombre             | Rol                               |
| ----------------- | ------------------ | --------------------------------- |
| `packages/api`    | `@finanzas/api`    | Backend Fastify + MongoDB + Redis |
| `packages/web`    | `@finanzas/web`    | SPA React + Vite + TailwindCSS    |
| `packages/mobile` | `@finanzas/mobile` | App React Native / Expo Router    |
| `packages/shared` | `@finanzas/shared` | Tipos y schemas Zod compartidos   |

## Convenciones críticas

- **Cantidades monetarias en centavos (integer)**: `amount: 1999` = €19.99. Nunca floats.
- **Fechas**: ISO 8601. El backend acepta `YYYY-MM-DD` y convierte a `Date`.
- **Respuestas API**: siempre `{ data: ... }` en éxito, `{ error: { code, message } }` en error.
- **Auth**: JWT Bearer en header `Authorization`. Refresh token via httpOnly cookie (web) o `POST /auth/refresh` (mobile).
- **Monedas**: código ISO 3 letras en mayúsculas (EUR, USD, etc.). Ver `CURRENCIES` en `@finanzas/shared`.
- **IDs**: MongoDB ObjectId (24 hex chars).

## Stack por paquete

```
api:     Fastify 4, Mongoose 8, Redis (ioredis), BullMQ, Zod 4, JWT, bcrypt, pino
web:     React 18, React Router 6, TanStack Query 5, Zustand 4, Axios, Tailwind, Radix UI
mobile:  Expo 54, React Native 0.81, Expo Router 6, TanStack Query 5, Zustand 5, Axios
shared:  Zod 4 (puro, sin dependencias de runtime)
```

## Scripts globales (desde raíz)

```bash
pnpm dev          # arranca api + web en paralelo
pnpm build        # build de todos los paquetes
pnpm test         # tests de todos los paquetes
pnpm typecheck    # TypeScript en todos los paquetes
```

## Variables de entorno

- `packages/api/.env` → `PORT`, `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `FRONTEND_URL`
- `packages/web/.env` → `VITE_API_URL`
- `packages/mobile/.env` → `EXPO_PUBLIC_API_URL`

## Módulos del API

El API usa estructura modular: `src/modules/<dominio>/`:

- `auth` — registro, login, refresh, logout, forgot/reset password, verify email
- `users` — perfil y preferencias del usuario
- `accounts` — cuentas financieras (checking, savings, crypto, mortgage…)
- `transactions` — transacciones, transferencias, bulk, stats
- `categories` — categorías de ingresos/gastos
- `categoryRules` — reglas de auto-categorización
- `budgets` — presupuestos con alertas
- `goals` — objetivos de ahorro
- `holdings` — inversiones (stocks, ETFs, crypto, bonds)
- `integrations` — Binance, etc.
- `simulators` — calculadoras financieras (hipoteca, préstamo, inversión, retiro)
- `notifications` — notificaciones push
- `reports` — exportación PDF y CSV
- `dashboard` — patrimonio neto, cashflow, resumen
- `currency` — tipos de cambio (Frankfurter API, caché Redis 1h)

## Cómo añadir una feature cross-platform

1. Añade tipos/schemas en `packages/shared/src/` si la entidad es nueva
2. Crea módulo en `packages/api/src/modules/<feature>/`
3. Registra rutas en `packages/api/src/server.ts`
4. Añade `<feature>.api.ts` en `packages/web/src/api/`
5. Añade `use<Feature>.ts` hook en `packages/web/src/hooks/`
6. Añade `<feature>.ts` en `packages/mobile/src/api/`
