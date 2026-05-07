# @finanzas/shared — Tipos y Schemas compartidos

Paquete **sin dependencias de runtime** salvo Zod 4. Consumido por `@finanzas/api` y `@finanzas/web`. No tiene dependencias de React, Node ni Express.

## Exports

```ts
import { UserSchema, AccountSchema, TransactionSchema, ... } from '@finanzas/shared';
import { CURRENCIES, SUPPORTED_EXCHANGES, DEFAULT_CATEGORIES } from '@finanzas/shared';
```

---

## Schemas Zod

### UserSchema

`id, email, name, baseCurrency (default EUR), language, timezone, createdAt, updatedAt`

### AccountSchema

`id, userId, name, type, currency, balance (centavos), initialBalance, institution?, color?, icon?, isArchived, includedInNetWorth`

`AccountTypeEnum`: `checking | savings | cash | credit_card | real_estate | vehicle | loan | mortgage | crypto | investment | other`

### TransactionSchema

`id, userId, accountId, categoryId?, type, description, amount (centavos), currency, date, tags[], notes?, recurring?, relatedTransactionId?, attachments[], isReconciled`

`TransactionTypeEnum`: `income | expense | transfer`
`RecurrenceFrequencyEnum`: `once | daily | weekly | biweekly | monthly | quarterly | annual`

### CategorySchema

`id, userId, name, type (income|expense), icon?, color?`

### CategoryRuleSchema

`id, userId, categoryId, conditions: RuleCondition[], priority`

`ConditionOperatorEnum`: `contains | starts_with | ends_with | equals | gt | lt | gte | lte`

### BudgetSchema

`id, userId, name, period, startDate, items: [{ categoryId, amount }], rollover`

`BudgetPeriodEnum`: `monthly | yearly`

### HoldingSchema

`id, userId, accountId, assetType, symbol, exchange, quantity (string decimal), averageBuyPrice (centavos), currency, currentPrice?, source`

`AssetTypeEnum`: `crypto | stock | etf | bond`

### IntegrationCredentialsSchema

`IntegrationTypeEnum`: `binance | plaid | finnhub`

### SimulationSchema

`SimulationTypeEnum`: `mortgage | loan | investment | early_repayment | retirement`

### PriceSnapshotSchema

`id, symbol, price (centavos), currency, source, timestamp`

### NetWorthSnapshotSchema

`id, userId, total, assets, liabilities, components: NetWorthComponent[], date`

---

## Constantes

```ts
CURRENCIES;
// ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK',
//  'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR']

SUPPORTED_EXCHANGES;
// ['NYSE', 'NASDAQ', 'LSE', 'TSE', 'ASX', 'TSX', 'SIX', 'SSE',
//  'HKEX', 'SEHK', 'MOEX', 'NSE', 'B3', 'BINANCE', 'COINBASE', 'KRAKEN']

DEFAULT_CATEGORIES;
// 17 categorías predefinidas (12 gastos + 5 ingresos) con name, type, icon, color
// Gastos: Alimentación, Transporte, Ocio, Salud, Hogar, Ropa, Educación,
//         Restaurantes, Utilidades, Entretenimiento, Seguros, Servicios Financieros
// Ingresos: Salario, Inversiones, Bonificación, Freelance, Otros Ingresos
```

---

## Directrices de uso y diseño de schemas

### Regla de compatibilidad

Al añadir un campo a un schema existente, hacerlo **opcional** (`z.optional()` o `.default()`). Un campo nuevo requerido rompe la BD existente sin migración.

```ts
// BIEN — campo nuevo opcional
const AccountSchema = z.object({
  // ...campos existentes...
  color: z.string().optional(), // campo nuevo
});

// MAL — campo nuevo requerido sin migración
const AccountSchema = z.object({
  // ...campos existentes...
  color: z.string(), // rompe documentos existentes sin color
});
```

### Tipos derivados

Generar tipos TypeScript desde los schemas, no escribirlos manualmente:

```ts
export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;
```

### Schemas de creación vs lectura

Separar el schema de lectura (con `id`, `createdAt`, etc.) del schema de creación (solo campos que envía el cliente):

```ts
// Para validar cuerpo de POST (cliente → API)
export const CreateTransactionSchema = z.object({
  accountId: z.string(),
  amount: z.number().int().positive(),
  // ... sin id, sin userId, sin createdAt
});

// Para tipar la respuesta del API (API → cliente)
export const TransactionSchema = CreateTransactionSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
});
```

### Cantidades monetarias

Siempre en **centavos** (integer): `z.number().int().positive()`. Nunca `z.number()` para cantidades de dinero.

### Cuándo añadir un schema aquí

Añadir a `@finanzas/shared` cuando la entidad o el DTO se usa tanto en el API como en el cliente (web o mobile). Si es solo interno al API, el schema va en `packages/api/src/modules/<dominio>/`.
