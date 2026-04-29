# Finanzas App - Monorepo

Aplicación de gestión de finanzas personales basada en un monorepo pnpm con TypeScript, Fastify y React.

## Estructura

```
finanzas-app/
├── packages/
│   ├── shared/          # Tipos Zod y TypeScript compartidos
│   ├── api/             # Backend Fastify (puerto 3001)
│   └── web/             # Frontend Vite + React (puerto 5173)
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── .husky/             # Git hooks con lint-staged
```

## Requisitos

- Node.js >= 20
- pnpm >= 9

## Instalación

```bash
# Instalar dependencias (en el root del monorepo)
pnpm install

# Configurar variables de entorno
cp packages/api/.env.example packages/api/.env
# Editar packages/api/.env con tus valores
```

## Desarrollo

```bash
# Ejecutar API y frontend en paralelo
pnpm dev

# O ejecutar de forma individual:
pnpm --filter @finanzas/api dev
pnpm --filter @finanzas/web dev
```

## Scripts disponibles

```bash
# Linting
pnpm lint          # Ejecutar eslint
pnpm lint:fix      # Ejecutar eslint con --fix

# Type checking
pnpm typecheck     # Verificar tipos de TypeScript

# Testing
pnpm test          # Ejecutar tests con vitest

# Build
pnpm build         # Compilar todos los packages
```

## Configuración

### Lint-staged + Husky

Los pre-commit hooks ejecutan automáticamente:

- ESLint con --fix
- Prettier --write
- TypeScript --noEmit

### ESLint

Está configurado para:

- Prohibir `any` completamente
- Validar orden de imports
- Validar hooks de React
- Integración con Prettier

### TypeScript

Configuración estricta en `tsconfig.base.json`:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitAny: true`

## Packages

### @finanzas/shared

Contiene todos los schemas Zod y tipos TypeScript compartidos.

Schemas incluidos:

- UserSchema
- AccountSchema (checking, savings, crypto, investment, etc.)
- TransactionSchema (con soporte para transacciones recurrentes)
- CategorySchema
- CategoryRuleSchema (reglas de auto-categorización)
- BudgetSchema
- HoldingSchema (inversiones y activos)
- IntegrationCredentialsSchema
- SimulationSchema (ahorros, inversiones, créditos, interés compuesto)
- PriceSnapshotSchema
- NetWorthSnapshotSchema

Constantes:

- CURRENCIES (monedas soportadas)
- SUPPORTED_EXCHANGES (bolsas de valores)
- DEFAULT_CATEGORIES (categorías predeterminadas)

### @finanzas/api

Backend Fastify con:

- Rate limiting
- CORS
- Helmet (seguridad)
- Cookie handling
- Logger pino

### @finanzas/web

Frontend React + Vite con:

- React Router
- TanStack React Query
- Zustand (state management)
- React Hook Form
- Tailwind CSS
- i18n
- Recharts
- Lucide React

## Variables de Entorno (packages/api/.env)

Requeridas:

- PORT=3001
- NODE_ENV=development
- MONGO_URI=mongodb://...
- REDIS_URL=redis://...
- JWT_SECRET (mínimo 32 caracteres)
- JWT_REFRESH_SECRET (mínimo 32 caracteres)
- ENCRYPTION_KEY (mínimo 64 caracteres hex)

Opcionales (APIs externas):

- BINANCE_API_KEY / BINANCE_API_SECRET
- CMC_API_KEY
- FINNHUB_API_KEY
- PLAID_CLIENT_ID / PLAID_SECRET / PLAID_ENVIRONMENT

## Notas de Desarrollo

- TypeScript estricto: no se permite `any`
- ESLint fuerza el tipo de retorno en funciones
- Pre-commit hooks automáticos con lint-staged
- Los packages comparten tipos vía @finanzas/shared
- Proxy de desarrollo en web para API (http://localhost:3001)
