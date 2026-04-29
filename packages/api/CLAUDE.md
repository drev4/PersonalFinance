# @finanzas/api — Backend Fastify

## Stack

Fastify 4 · Mongoose 8 · MongoDB · Redis (ioredis) · BullMQ · Zod 4 · JWT · bcrypt · pino · ESM

## Arranque

```bash
pnpm dev    # tsx watch src/server.ts — puerto 3001
pnpm test   # vitest (MongoDB in-memory + ioredis-mock)
```

## Estructura

```
src/
├── server.ts              Entry point, registra plugins y rutas
├── config/
│   ├── db.ts              Conexión Mongoose
│   ├── redis.ts           Cliente ioredis singleton
│   └── env.ts             Variables de entorno validadas con Zod
├── middlewares/
│   ├── authenticate.ts    requireAuth — extrae JWT y pone req.user
│   ├── rateLimiter.ts     Config global de rate limit
│   ├── sanitize.ts        Limpia __proto__ / prototype del body
│   └── securityHeaders.ts X-Frame-Options, Cache-Control
├── services/
│   └── currency.service.ts  getRates, convertWithRates, convertCents
├── jobs/                  BullMQ workers
│   ├── priceUpdate.job.ts     Actualiza precios de holdings cada hora
│   ├── netWorthSnapshot.job.ts  Snapshot diario de patrimonio
│   ├── recurringTransactions.job.ts  Genera transacciones recurrentes
│   └── notifications.job.ts   Alertas de presupuesto
└── modules/<dominio>/
    ├── <dominio>.model.ts       Schema Mongoose
    ├── <dominio>.repository.ts  Acceso a BD (queries)
    ├── <dominio>.service.ts     Lógica de negocio
    ├── <dominio>.routes.ts      Handlers Fastify + validación Zod
    └── __tests__/               Vitest
```

## Patrón de módulo

Cada módulo sigue: `routes → service → repository → model`

- **routes**: valida con Zod, llama al service, transforma errores
- **service**: lógica de negocio, lanza errores tipados (e.g. `TransactionError`)
- **repository**: queries Mongoose puras
- **model**: schema Mongoose + índices

## Formato de respuestas

```jsonc
// Éxito
{ "data": { ... } }
{ "data": [ ... ] }

// Error
{ "error": { "code": "SNAKE_UPPER_CASE", "message": "descripción" } }
```

## Autenticación

- `requireAuth` middleware: verifica JWT en `Authorization: Bearer <token>`
- `req.user` contiene `{ userId, email }`
- Refresh token: httpOnly cookie (web) o body `refreshToken` (mobile)
- Rate limit auth: 10 req / 15 min en prod, 100 en dev

## Endpoints completos

### Auth — `/auth/*` (sin requireAuth salvo logout)

| Método | Ruta                    | Body                               | Respuesta                         |
| ------ | ----------------------- | ---------------------------------- | --------------------------------- |
| POST   | `/auth/register`        | `{ email, password, name }`        | `{ data: { user, accessToken } }` |
| POST   | `/auth/login`           | `{ email, password }`              | `{ data: { user, accessToken } }` |
| POST   | `/auth/refresh`         | `{}` (cookie) o `{ refreshToken }` | `{ data: { accessToken } }`       |
| POST   | `/auth/logout`          | —                                  | 204                               |
| POST   | `/auth/forgot-password` | `{ email }`                        | `{ data: { ok: true } }`          |
| POST   | `/auth/reset-password`  | `{ token, password }`              | `{ data: { ok: true } }`          |
| POST   | `/auth/verify-email`    | `{ token }`                        | `{ data: { ok: true } }`          |

### Usuarios — `/users/*` (requireAuth)

| Método | Ruta        | Descripción                                      |
| ------ | ----------- | ------------------------------------------------ |
| GET    | `/users/me` | Perfil del usuario autenticado                   |
| PATCH  | `/users/me` | Actualiza nombre, idioma, timezone, baseCurrency |

### Cuentas — `/accounts/*` (requireAuth)

| Método | Ruta                    | Descripción                                                                                                     |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/accounts`             | Lista todas las cuentas del usuario                                                                             |
| POST   | `/accounts`             | Crea cuenta. Body: `{ name, type, currency, initialBalance, institution?, color?, icon?, includedInNetWorth? }` |
| GET    | `/accounts/:id`         | Cuenta por ID                                                                                                   |
| PATCH  | `/accounts/:id`         | Actualiza campos opcionales                                                                                     |
| DELETE | `/accounts/:id`         | Archiva (soft delete)                                                                                           |
| PATCH  | `/accounts/:id/balance` | Ajusta saldo. Body: `{ newBalance, note? }`                                                                     |
| GET    | `/accounts/net-worth`   | Patrimonio neto actual (alias de dashboard)                                                                     |

Tipos de cuenta: `checking | savings | cash | credit_card | real_estate | vehicle | loan | mortgage | crypto | investment | other`

### Transacciones — `/transactions/*` (requireAuth)

| Método | Ruta                                       | Query / Body                                                                                                       | Respuesta                                        |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| GET    | `/transactions`                            | `from?, to?, categoryId?, accountId?, type?, search?, tags?, page?, limit?`                                        | `{ data: { items, total, page, limit } }`        |
| POST   | `/transactions`                            | `{ accountId, type, amount, currency, date, description, categoryId?, tags?, attachments?, source?, externalId? }` | `{ data: transaction }`                          |
| GET    | `/transactions/:id`                        | —                                                                                                                  | `{ data: transaction }`                          |
| PATCH  | `/transactions/:id`                        | campos opcionales                                                                                                  | `{ data: transaction }`                          |
| DELETE | `/transactions/:id`                        | —                                                                                                                  | 204                                              |
| POST   | `/transactions/transfer`                   | `{ fromAccountId, toAccountId, amount, date, description, currency?, tags? }`                                      | `{ data: { from, to } }`                         |
| POST   | `/transactions/bulk`                       | `{ transactions: [...] }`                                                                                          | `{ data: { created, errors } }`                  |
| GET    | `/transactions/stats/spending-by-category` | `from, to` (requeridos)                                                                                            | `{ data: [{ categoryId, name, total, count }] }` |
| GET    | `/transactions/stats/cashflow`             | `months? (1-24, default 6)`                                                                                        | `{ data: [{ month, income, expenses, net }] }`   |

- `amount` siempre en **centavos** (integer positivo)
- `type`: `income | expense | transfer | adjustment`
- `date`: acepta `YYYY-MM-DD` o ISO datetime

### Categorías — `/categories/*` (requireAuth)

| Método | Ruta              | Descripción                                           |
| ------ | ----------------- | ----------------------------------------------------- |
| GET    | `/categories`     | Lista categorías del usuario (incluye defaults)       |
| POST   | `/categories`     | Crea categoría. Body: `{ name, type, icon?, color? }` |
| PATCH  | `/categories/:id` | Actualiza                                             |
| DELETE | `/categories/:id` | Elimina (solo si no tiene transacciones)              |

### Reglas de categoría — `/category-rules/*` (requireAuth)

| Método | Ruta                  | Descripción                                                                             |
| ------ | --------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/category-rules`     | Lista reglas del usuario                                                                |
| POST   | `/category-rules`     | Crea regla. Body: `{ categoryId, conditions: [{ field, operator, value }], priority? }` |
| PATCH  | `/category-rules/:id` | Actualiza                                                                               |
| DELETE | `/category-rules/:id` | Elimina                                                                                 |

### Presupuestos — `/budgets/*` (requireAuth)

| Método | Ruta                    | Descripción                                                                                              |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | `/budgets`              | Lista presupuestos                                                                                       |
| POST   | `/budgets`              | Crea. Body: `{ name, period, startDate, items: [{ categoryId, amount }], rollover? }`                    |
| GET    | `/budgets/:id`          | Detalle                                                                                                  |
| PATCH  | `/budgets/:id`          | Actualiza                                                                                                |
| DELETE | `/budgets/:id`          | Elimina                                                                                                  |
| GET    | `/budgets/:id/progress` | Progreso actual. Query: `referenceDate?` → `{ data: [{ categoryId, budgeted, spent, remaining, pct }] }` |
| GET    | `/budgets/alerts`       | Categorías al ≥80% del presupuesto → `{ data: [{ budgetId, categoryId, pct, spent, budgeted }] }`        |

`period`: `monthly | yearly`

### Objetivos — `/goals/*` (requireAuth)

| Método | Ruta         | Descripción                                                             |
| ------ | ------------ | ----------------------------------------------------------------------- |
| GET    | `/goals`     | Lista objetivos de ahorro                                               |
| POST   | `/goals`     | Crea. Body: `{ name, targetAmount, currency, targetDate?, accountId? }` |
| GET    | `/goals/:id` | Detalle con progreso                                                    |
| PATCH  | `/goals/:id` | Actualiza                                                               |
| DELETE | `/goals/:id` | Elimina                                                                 |

### Holdings (inversiones) — `/holdings/*` (requireAuth)

| Método | Ruta                                 | Descripción                                                                                                                                  |
| ------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/holdings`                          | Lista posiciones del usuario                                                                                                                 |
| POST   | `/holdings`                          | Crea posición. Body: `{ accountId, assetType, symbol, exchange?, quantity, averageBuyPrice, currency, currentPrice?, source?, externalId? }` |
| GET    | `/holdings/:id`                      | Posición por ID                                                                                                                              |
| PATCH  | `/holdings/:id`                      | Actualiza                                                                                                                                    |
| DELETE | `/holdings/:id`                      | Elimina                                                                                                                                      |
| GET    | `/holdings/search?q=AAPL&type=stock` | Busca ticker (Finnhub/CoinMarketCap) → `{ data: [{ symbol, name, exchange }] }`                                                              |
| GET    | `/holdings/search-ticker`            | Alias de search                                                                                                                              |
| GET    | `/holdings/portfolio/summary`        | Resumen de cartera → `{ data: { totalValue, totalCost, gainLoss, gainLossPct, byAssetType } }`                                               |
| GET    | `/holdings/portfolio-summary`        | Alias                                                                                                                                        |
| POST   | `/holdings/import-csv`               | Body: `{ accountId, csvContent }` → `{ data: { created, errors } }`                                                                          |

`assetType`: `crypto | stock | etf | bond`  
`quantity`: string decimal (e.g. `"0.5"`)  
`averageBuyPrice`: centavos integer

### Dashboard — `/dashboard/*` (requireAuth)

| Método | Ruta                              | Query                              | Respuesta                                                   |
| ------ | --------------------------------- | ---------------------------------- | ----------------------------------------------------------- | --- | --- | ---- | ----------------------------- |
| GET    | `/dashboard/net-worth`            | —                                  | `{ data: { total, assets, liabilities, accounts: [...] } }` |
| GET    | `/dashboard/net-worth/history`    | `period: 1m                        | 3m                                                          | 6m  | 1y  | all` | `{ data: [{ date, total }] }` |
| GET    | `/dashboard/cashflow`             | `months? (1-24)`                   | `{ data: [{ month, income, expenses, net }] }`              |
| GET    | `/dashboard/spending-by-category` | `from?, to?` (default: mes actual) | `{ data: [{ categoryId, name, total, count }] }`            |
| GET    | `/dashboard/upcoming-recurring`   | `days? (1-365, default 30)`        | `{ data: [{ transaction, nextDate, amount }] }`             |
| POST   | `/dashboard/snapshot`             | —                                  | Fuerza snapshot de patrimonio → `{ data: { ok: true } }`    |

### Transacciones recurrentes — `/transactions/recurring/*` (requireAuth)

| Método | Ruta                          | Descripción                          |
| ------ | ----------------------------- | ------------------------------------ | ----- | ------ | -------- | ------- | --------- | ------- |
| GET    | `/transactions/recurring`     | Lista plantillas recurrentes activas |
| POST   | `/transactions/recurring`     | Crea plantilla con `frequency: once  | daily | weekly | biweekly | monthly | quarterly | annual` |
| PATCH  | `/transactions/recurring/:id` | Actualiza                            |
| DELETE | `/transactions/recurring/:id` | Cancela                              |

### Integraciones — `/integrations/*` (requireAuth)

| Método | Ruta                     | Descripción                                     |
| ------ | ------------------------ | ----------------------------------------------- |
| GET    | `/integrations`          | Lista integraciones conectadas                  |
| POST   | `/integrations/binance`  | Body: `{ apiKey, apiSecret }` — conecta Binance |
| DELETE | `/integrations/:id`      | Desconecta                                      |
| POST   | `/integrations/:id/sync` | Fuerza sync manual                              |

### Simuladores — `/simulators/*` (SIN auth, rate limit 20/min)

| Método | Ruta                          | Body                                                                              | Respuesta                                                                     |
| ------ | ----------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| POST   | `/simulators/mortgage`        | `{ principal, annualRate, termYears, downPayment? }`                              | `{ data: { monthlyPayment, totalPaid, totalInterest, amortization: [...] } }` |
| POST   | `/simulators/loan`            | `{ principal, annualRate, termMonths }`                                           | `{ data: { monthlyPayment, totalPaid, totalInterest } }`                      |
| POST   | `/simulators/investment`      | `{ initialAmount, monthlyContribution, annualRate, years }`                       | `{ data: { finalAmount, totalContributed, totalGains, timeline: [...] } }`    |
| POST   | `/simulators/early-repayment` | `{ principal, annualRate, termMonths, extraPayment }`                             | `{ data: { savedInterest, monthsSaved, newPayoff } }`                         |
| POST   | `/simulators/retirement`      | `{ currentAge, retirementAge, monthlyContribution, annualRate, currentSavings? }` | `{ data: { projectedAmount, timeline: [...] } }`                              |

### Simulaciones guardadas — `/simulations/*` (requireAuth)

| Método | Ruta                   | Descripción                                  |
| ------ | ---------------------- | -------------------------------------------- |
| GET    | `/simulations`         | Lista simulaciones guardadas. Query: `type?` |
| POST   | `/simulations`         | Guarda. Body: `{ type, name, inputs }`       |
| GET    | `/simulations/:id`     | Detalle                                      |
| DELETE | `/simulations/:id`     | Elimina                                      |
| GET    | `/simulations/:id/pdf` | Descarga PDF → `application/pdf`             |

### Notificaciones — `/notifications/*` (requireAuth)

| Método | Ruta                             | Descripción                                       |
| ------ | -------------------------------- | ------------------------------------------------- |
| GET    | `/notifications`                 | Lista notificaciones (paginado)                   |
| PATCH  | `/notifications/:id/read`        | Marca como leída                                  |
| PATCH  | `/notifications/read-all`        | Marca todas como leídas                           |
| DELETE | `/notifications/:id`             | Elimina                                           |
| POST   | `/notifications/register-device` | Body: `{ token, platform }` — registra token push |

### Reportes — `/reports/*` (requireAuth, 5 req/min)

| Método | Ruta               | Query                                                    | Respuesta                          |
| ------ | ------------------ | -------------------------------------------------------- | ---------------------------------- |
| GET    | `/reports/monthly` | `year, month`                                            | PDF `informe-mensual-YYYY-MM.pdf`  |
| GET    | `/reports/yearly`  | `year`                                                   | PDF `informe-anual-YYYY.pdf`       |
| GET    | `/reports/export`  | `format=csv, from?, to?, accountId?, categoryId?, type?` | CSV `transacciones-YYYY-MM-DD.csv` |

### Moneda — `/currency/*` (requireAuth)

| Método | Ruta              | Query                 | Respuesta                                                         |
| ------ | ----------------- | --------------------- | ----------------------------------------------------------------- |
| GET    | `/currency/rates` | `base? (default EUR)` | `{ data: { base: "EUR", rates: { USD: 1.08, GBP: 0.85, ... } } }` |

- Datos de **Frankfurter API** (https://api.frankfurter.app)
- Cache Redis **1 hora** con clave `exchange_rates:<BASE>`
- `rates[base]` siempre es `1`
- Conversión: `amount / rates[from] * rates[to]`

## Jobs de background (BullMQ)

| Job                     | Frecuencia        | Función                                                                  |
| ----------------------- | ----------------- | ------------------------------------------------------------------------ |
| `priceUpdate`           | Cada hora         | Actualiza `currentPrice` de todos los holdings via Finnhub/CoinMarketCap |
| `netWorthSnapshot`      | Diario medianoche | Persiste snapshot de patrimonio neto por usuario                         |
| `recurringTransactions` | Cada hora         | Genera transacciones a partir de plantillas recurrentes activas          |
| `notifications`         | Cada hora         | Evalúa alertas de presupuesto y envía notificaciones push                |

## Errores de dominio

Cada módulo exporta su clase de error tipado:

```ts
class TransactionError extends Error {
  statusCode: number; // 400, 404, 409…
  code: string; // "INSUFFICIENT_FUNDS", "ACCOUNT_NOT_FOUND"…
}
```
