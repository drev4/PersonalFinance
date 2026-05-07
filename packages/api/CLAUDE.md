# @finanzas/api — Backend Fastify

## Stack

Fastify 4 · Mongoose 8 · MongoDB · Redis (ioredis) · BullMQ · Zod 4 · JWT · bcrypt · pino · ESM · Node ≥20

## Arranque

```bash
pnpm dev        # tsx watch src/server.ts — puerto 3001
pnpm test       # vitest (MongoDB in-memory + ioredis-mock)
pnpm typecheck
```

Variables de entorno en `packages/api/.env` (ver `.env.example`).

---

## Estructura

```
src/
├── server.ts              Entry point — registra plugins y rutas
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
├── utils/
│   ├── jwt.ts             signToken, verifyToken
│   ├── crypto.ts          hash, compare (bcrypt)
│   ├── email.ts           sendEmail via Resend
│   ├── logger.ts          pino logger singleton
│   └── sanitize.ts        sanitizeInput helper
├── jobs/                  BullMQ workers
│   ├── priceUpdate.job.ts         Precios de holdings cada hora
│   ├── netWorthSnapshot.job.ts    Snapshot diario de patrimonio
│   ├── recurringTransactions.job.ts  Transacciones recurrentes cada hora
│   └── notifications.job.ts       Alertas de presupuesto cada hora
└── modules/<dominio>/
    ├── <dominio>.model.ts         Schema Mongoose + índices
    ├── <dominio>.repository.ts    Queries Mongoose (sin lógica)
    ├── <dominio>.service.ts       Lógica de negocio
    ├── <dominio>.routes.ts        Handlers Fastify + validación Zod
    └── __tests__/                 Vitest
```

## Módulos disponibles

`auth` · `users` · `accounts` · `transactions` · `categories` · `categoryRules` · `budgets` · `goals` · `holdings` · `integrations` · `simulators` (+ `simulations`) · `notifications` · `reports` · `dashboard` · `currency` · `audit`

---

## Arquitectura de módulo

Flujo de dependencias: `routes → service → repository → model`

### routes (`<dominio>.routes.ts`)

- Registra handlers en Fastify con `fastify.get/post/patch/delete`
- Valida body/params/query con Zod **antes** de llamar al service
- Transforma errores de dominio a respuestas HTTP
- No contiene lógica de negocio

```ts
fastify.post('/transactions', async (req, reply) => {
  const body = CreateTransactionSchema.parse(req.body);
  const tx = await transactionService.create(req.user.userId, body);
  return reply.code(201).send({ data: tx });
});
```

### service (`<dominio>.service.ts`)

- Contiene toda la lógica de negocio
- Llama al repository para acceso a datos
- Lanza errores de dominio tipados con `statusCode` y `code`
- No conoce Fastify ni HTTP

```ts
class TransactionError extends Error {
  statusCode: number;
  code: string;
  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}
```

### repository (`<dominio>.repository.ts`)

- Solo queries Mongoose: find, findById, create, updateOne, deleteOne
- Sin lógica condicional de negocio
- Devuelve documentos Mongoose o `null`

### model (`<dominio>.model.ts`)

- Schema Mongoose + índices
- Usar `{ timestamps: true }` salvo excepción justificada
- Índices compuestos con `{ userId: 1, date: -1 }` para queries frecuentes

---

## Formato de respuestas (obligatorio)

```jsonc
// Éxito
{ "data": { ... } }
{ "data": [ ... ] }

// Error
{ "error": { "code": "SNAKE_UPPER_CASE", "message": "descripción legible" } }
```

Los códigos de error son SCREAMING_SNAKE y descriptivos: `ACCOUNT_NOT_FOUND`, `INSUFFICIENT_FUNDS`, `INVALID_DATE_RANGE`.

---

## Autenticación

- `requireAuth` en `middlewares/authenticate.ts`: verifica JWT en `Authorization: Bearer <token>`, popula `req.user = { userId, email }`
- Refresh token: httpOnly cookie (web) o body `refreshToken` (mobile)
- Rate limit auth endpoints: 10 req/15 min en prod, 100 en dev

---

## Validación con Zod

Siempre validar en routes, no en el service:

```ts
const body = CreateAccountSchema.parse(req.body); // lanza ZodError → 400 automático
```

Los schemas de validación viven en `<dominio>.routes.ts` o importados de `@finanzas/shared`.

---

## Endpoints completos

### Auth — `/auth/*`

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
| GET    | `/accounts/net-worth`   | Patrimonio neto actual                                                                                          |

Tipos: `checking | savings | cash | credit_card | real_estate | vehicle | loan | mortgage | crypto | investment | other`

### Transacciones — `/transactions/*` (requireAuth)

| Método | Ruta                                       | Descripción                                                                         |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| GET    | `/transactions`                            | Lista. Query: `from?, to?, categoryId?, accountId?, type?, search?, page?, limit?`  |
| POST   | `/transactions`                            | Crea. Body: `{ accountId, type, amount, currency, date, description, categoryId? }` |
| GET    | `/transactions/:id`                        | Por ID                                                                              |
| PATCH  | `/transactions/:id`                        | Actualiza                                                                           |
| DELETE | `/transactions/:id`                        | Elimina                                                                             |
| POST   | `/transactions/transfer`                   | Body: `{ fromAccountId, toAccountId, amount, date, description }`                   |
| POST   | `/transactions/bulk`                       | Body: `{ transactions: [...] }` → `{ data: { created, errors } }`                   |
| GET    | `/transactions/stats/spending-by-category` | Query: `from, to` (requeridos)                                                      |
| GET    | `/transactions/stats/cashflow`             | Query: `months? (1-24, default 6)`                                                  |

`amount` siempre en **centavos** (integer positivo). `type`: `income | expense | transfer | adjustment`.

### Categorías — `/categories/*` (requireAuth)

CRUD estándar. Body create: `{ name, type, icon?, color? }`. `type`: `income | expense`.

### Reglas de categoría — `/category-rules/*` (requireAuth)

CRUD. Body create: `{ categoryId, conditions: [{ field, operator, value }], priority? }`.
`operator`: `contains | starts_with | ends_with | equals | gt | lt | gte | lte`

### Presupuestos — `/budgets/*` (requireAuth)

CRUD + `GET /budgets/:id/progress` + `GET /budgets/alerts` (categorías al ≥80%).
`period`: `monthly | yearly`.

### Objetivos — `/goals/*` (requireAuth)

CRUD + `POST /goals/:id/deposit` con `{ amount }`.

### Holdings — `/holdings/*` (requireAuth)

CRUD + `GET /holdings/search?q=AAPL&type=stock` + `GET /holdings/portfolio/summary` + `POST /holdings/import-csv`.
`assetType`: `crypto | stock | etf | bond`. `quantity`: string decimal. `averageBuyPrice`: centavos.

### Dashboard — `/dashboard/*` (requireAuth)

| Ruta                                  | Descripción                                |
| ------------------------------------- | ------------------------------------------ | --- | --- | --- | ---- |
| `GET /dashboard/net-worth`            | `{ total, assets, liabilities, accounts }` |
| `GET /dashboard/net-worth/history`    | Query: `period: 1m                         | 3m  | 6m  | 1y  | all` |
| `GET /dashboard/cashflow`             | Query: `months? (1-24)`                    |
| `GET /dashboard/spending-by-category` | Query: `from?, to?` (default: mes actual)  |
| `GET /dashboard/upcoming-recurring`   | Query: `days? (1-365, default 30)`         |
| `GET /dashboard/health-score`         | Score 0-100 con desglose en 4 áreas        |
| `POST /dashboard/snapshot`            | Fuerza snapshot de patrimonio              |

### Simuladores — `/simulators/*` (sin auth, rate limit 20/min)

POST: `mortgage`, `loan`, `investment`, `early-repayment`, `retirement`.

### Simulaciones guardadas — `/simulations/*` (requireAuth)

CRUD + `GET /simulations/:id/pdf`.

### Notificaciones — `/notifications/*` (requireAuth)

CRUD + `PATCH /notifications/read-all` + `POST /notifications/register-device`.

### Reportes — `/reports/*` (requireAuth, 5 req/min)

`GET /reports/monthly?year&month`, `GET /reports/yearly?year`, `GET /reports/export?format=csv`.

### Moneda — `/currency/*` (requireAuth)

`GET /currency/rates?base=EUR` → datos de Frankfurter API, caché Redis 1h.

---

## Jobs de background (BullMQ)

| Job                     | Frecuencia        | Función                                            |
| ----------------------- | ----------------- | -------------------------------------------------- |
| `priceUpdate`           | Cada hora         | Actualiza `currentPrice` via Finnhub/CoinMarketCap |
| `netWorthSnapshot`      | Diario medianoche | Persiste snapshot de patrimonio neto               |
| `recurringTransactions` | Cada hora         | Genera transacciones desde plantillas              |
| `notifications`         | Cada hora         | Evalúa alertas de presupuesto y envía push         |

---

## Directrices de código limpio

### Patrón de módulo

Crear un módulo nuevo sigue siempre este orden y no debe saltarse capas:

```
1. model.ts      → define el schema y el índice
2. repository.ts → query functions (sin lógica)
3. service.ts    → lógica de negocio (usa repository)
4. routes.ts     → validación + handler (usa service)
```

### Errores de dominio

Cada módulo define su clase de error:

```ts
export class AccountError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'AccountError';
  }
}
// Uso: throw new AccountError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
```

El handler de error global en `server.ts` convierte estos a `{ error: { code, message } }`.

### Repository: solo queries

```ts
// BIEN — solo acceso a datos
export async function findByUser(userId: string) {
  return Account.find({ userId, isArchived: false }).lean();
}

// MAL — lógica de negocio en el repository
export async function findActiveWithBalance(userId: string, minBalance: number) {
  const accounts = await Account.find({ userId }).lean();
  return accounts.filter((a) => a.balance > minBalance); // ← esto va en el service
}
```

### Validación: en routes, no en service

```ts
// routes.ts — valida y transforma entrada
const body = CreateTransactionSchema.parse(req.body);
await transactionService.create(req.user.userId, body);

// service.ts — asume que la entrada ya es válida, aplica reglas de negocio
async create(userId: string, dto: CreateTransactionDto) {
  const account = await accountRepository.findById(dto.accountId);
  if (!account) throw new TransactionError('ACCOUNT_NOT_FOUND', '...', 404);
  // ...
}
```

### Tests

- Ubicados en `src/modules/<dominio>/__tests__/<dominio>.service.test.ts`
- Usar MongoDB in-memory (`mongodb-memory-server`) e `ioredis-mock`
- Testear comportamiento del service, no implementación del repository
- Cada `describe` cubre un método del service; cada `it` un caso
