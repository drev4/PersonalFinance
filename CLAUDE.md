# Finanzas App — Monorepo

pnpm monorepo con 4 paquetes que comparten tipos vía `@finanzas/shared`.

## Paquetes

| Paquete           | Nombre             | Rol                               | Puerto |
| ----------------- | ------------------ | --------------------------------- | ------ |
| `packages/api`    | `@finanzas/api`    | Backend Fastify + MongoDB + Redis | 3001   |
| `packages/web`    | `@finanzas/web`    | SPA React + Vite + TailwindCSS    | 5173   |
| `packages/mobile` | `@finanzas/mobile` | App React Native / Expo Router    | —      |
| `packages/shared` | `@finanzas/shared` | Tipos y schemas Zod compartidos   | —      |

## Scripts (desde raíz)

```bash
pnpm dev          # api + web en paralelo
pnpm build        # build todos los paquetes
pnpm test         # vitest en todos los paquetes
pnpm typecheck    # TypeScript en todos los paquetes
pnpm ios          # Expo iOS
pnpm android      # Expo Android
```

## Variables de entorno

- `packages/api/.env` → `PORT`, `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `RESEND_API_KEY`, `FINNHUB_API_KEY`, `CMC_API_KEY`
- `packages/web/.env` → `VITE_API_URL` (default: `http://localhost:3001`)
- `packages/mobile/.env` → `EXPO_PUBLIC_API_URL` (default: `http://localhost:3001`)

## Convenciones globales

- **Cantidades monetarias en centavos (integer)**: `amount: 1999` = €19,99. Nunca floats.
- **Fechas**: ISO 8601. El backend acepta `YYYY-MM-DD`.
- **Respuestas API**: `{ data: ... }` en éxito, `{ error: { code, message } }` en error.
- **Auth**: JWT Bearer en `Authorization` header. Refresh via httpOnly cookie (web) o body (mobile).
- **Monedas**: código ISO 3 letras mayúsculas (EUR, USD). Ver `CURRENCIES` en `@finanzas/shared`.
- **IDs**: MongoDB ObjectId (24 hex chars).

## Gestión de producto

- **`ROADMAP.md`** — épicas priorizadas, estado y alcance de cada una
- **`changes/<epic-slug>.md`** — spec técnica de la épica (se crea ANTES de empezar a desarrollar, usando `changes/TEMPLATE.md`)
- Rama por épica: `feature/<epic-slug>` creada desde `develop`
- Merge a `develop` solo tras validación de Diego

## Flujo para añadir una feature cross-platform

1. Si la entidad es nueva → schema Zod en `packages/shared/src/schemas/`
2. Módulo en `packages/api/src/modules/<feature>/` con model → repository → service → routes
3. Registrar rutas en `packages/api/src/server.ts`
4. `<feature>.api.ts` en `packages/web/src/api/`
5. `use<Feature>.ts` hook en `packages/web/src/hooks/`
6. `<feature>.ts` en `packages/mobile/src/api/`

---

## Arquitectura limpia

### Principio fundamental: dependencias hacia adentro

```
UI / Pantallas
    ↓
Hooks / ViewModels
    ↓
API clients / Stores
    ↓
Tipos compartidos (@finanzas/shared)
```

Las capas externas dependen de las internas. Nunca al revés.

### Separación de responsabilidades

**No mezclar en el mismo fichero:**

- Llamadas HTTP + lógica de UI
- Estado global + lógica de negocio
- Transformación de datos + presentación

**Regla de tamaño:** un fichero de componente que supera 250 líneas probablemente tiene demasiadas responsabilidades. Extrae.

### Dependencias entre paquetes

```
api      → shared
web      → shared
mobile   → shared
shared   → (nada)
```

`web` y `mobile` nunca se importan entre sí. `api` no importa de `web` ni `mobile`.

---

## Código limpio — reglas de proyecto

### Nombrado

- **Componentes / clases**: PascalCase → `TransactionRow`, `AuthService`
- **Funciones / variables**: camelCase → `formatCurrency`, `accessToken`
- **Constantes exportadas**: SCREAMING_SNAKE → `DEFAULT_CATEGORIES`, `CURRENCIES`
- **Ficheros**: kebab-case en config, camelCase.dominio.tipo en módulos → `transaction.service.ts`, `useTransactions.ts`
- **Tipos e interfaces**: PascalCase sin prefijo `I` → `Transaction`, `AccountType`
- **Enums**: PascalCase nombre, PascalCase valores → `AssetType.Crypto`
- **Booleanos**: prefijo `is`, `has`, `can` → `isArchived`, `hasError`, `canDelete`
- **Handlers de eventos**: prefijo `handle` en componentes → `handleSubmit`, `handleDelete`

### Funciones

- Una función hace una cosa. Si se necesita `y` para describir lo que hace, probablemente son dos funciones.
- Máximo 3 parámetros. Si necesitas más, usa un objeto con tipos explícitos.
- Extrae la lógica condicional compleja a funciones con nombre descriptivo.
- Evita booleanos como parámetro de control de flujo (`sendEmail(user, true)` → sin contexto).

### Componentes React

- Un componente = una responsabilidad de UI.
- Props tipadas siempre con interface explícita.
- Nunca datos hardcoded en un componente: usar theme, i18n, o constantes.
- Los efectos secundarios van en hooks, no en el cuerpo del componente.

### Comentarios

- No escribas comentarios que expliquen QUÉ hace el código (los nombres lo hacen).
- Sí escribe un comentario cuando el PORQUÉ no es obvio: una restricción oculta, una invariante sutil, un workaround.
- Un máximo de una línea. Sin bloques de párrafos.

### Anti-patrones a evitar

- `any` en TypeScript — usa `unknown` si el tipo es realmente desconocido, o tipar correctamente.
- Llamadas Axios directamente en componentes o páginas.
- `console.log` en código que no es temporal de debug.
- Mutación directa de estado en Zustand (fuera del setter).
- Colores o valores de espaciado hardcoded en componentes (usar theme/tokens).
- `useEffect` con dependencias vacías para "cargar datos" (usar TanStack Query).

### Gestión de errores

- En el API: errores de dominio tipados (`TransactionError`, `AccountError`) con `statusCode` y `code`.
- En el cliente: los hooks TanStack Query exponen `error` y `isError`. Tratar siempre.
- Nunca silenciar errores con `catch(() => {})`.

### Testing

- Tests unitarios para lógica de negocio pura (calculadoras, servicios con repos mockeados).
- Tests de integración en la API con MongoDB in-memory + ioredis-mock.
- No mockear la base de datos si es posible evitarlo: los mocks de BD enmascaran migraciones rotas.
- Un test describe un comportamiento, no una implementación.
