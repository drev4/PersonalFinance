# @finanzas/shared — Tipos y Schemas compartidos

Paquete **sin dependencias de runtime** salvo Zod 4. Usado tanto por `api` como por `web`.

## Exports

```ts
import { UserSchema, AccountSchema, TransactionSchema, ... } from '@finanzas/shared';
import { CURRENCIES, SUPPORTED_EXCHANGES, DEFAULT_CATEGORIES } from '@finanzas/shared';
```

## Schemas (Zod)

### UserSchema

Campos: `id, email, name, baseCurrency (default EUR), language, timezone, createdAt, updatedAt`

### AccountSchema

Campos: `id, userId, name, type, currency, balance (centavos), initialBalance, institution?, color?, icon?, isArchived, includedInNetWorth`  
`AccountTypeEnum`: `checking | savings | cash | credit_card | real_estate | vehicle | loan | mortgage | crypto | investment | other`

### TransactionSchema

Campos: `id, userId, accountId, categoryId?, type, description, amount (centavos), currency, date, tags[], notes?, recurring?, relatedTransactionId?, attachments[], isReconciled`  
`TransactionTypeEnum`: `income | expense | transfer`  
`RecurrenceFrequencyEnum`: `once | daily | weekly | biweekly | monthly | quarterly | annual`

### CategorySchema

Campos: `id, userId, name, type (income|expense), icon?, color?`

### CategoryRuleSchema

Campos: `id, userId, categoryId, conditions: RuleCondition[], priority`  
`ConditionOperatorEnum`: `contains | starts_with | ends_with | equals | gt | lt | gte | lte`

### BudgetSchema

Campos: `id, userId, name, period, startDate, items: [{ categoryId, amount }], rollover`  
`BudgetPeriodEnum`: `monthly | yearly`

### HoldingSchema

Campos: `id, userId, accountId, assetType, symbol, exchange, quantity (string decimal), averageBuyPrice (centavos), currency, currentPrice?, source`  
`AssetTypeEnum`: `crypto | stock | etf | bond`

### IntegrationCredentialsSchema

`IntegrationTypeEnum`: `binance | plaid | finnhub`

### SimulationSchema

`SimulationTypeEnum`: `mortgage | loan | investment | early_repayment | retirement`

### PriceSnapshotSchema

Campos: `id, symbol, price (centavos), currency, source, timestamp`

### NetWorthSnapshotSchema / NetWorthComponentSchema

Campos: `id, userId, total, assets, liabilities, components: NetWorthComponent[], date`

## Constantes

```ts
CURRENCIES; // ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK',
//  'NZD', 'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR']

SUPPORTED_EXCHANGES; // ['NYSE', 'NASDAQ', 'LSE', 'TSE', 'ASX', 'TSX', 'SIX', 'SSE',
//  'HKEX', 'SEHK', 'MOEX', 'NSE', 'B3', 'BINANCE', 'COINBASE', 'KRAKEN']

DEFAULT_CATEGORIES; // 17 categorías predefinidas (12 gastos + 5 ingresos) con name, type, icon, color
// Alimentación, Transporte, Ocio, Salud, Hogar, Ropa, Educación,
// Restaurantes, Utilidades, Entretenimiento, Seguros, Servicios Financieros,
// Salario, Inversiones, Bonificación, Freelance, Otros Ingresos
```

## Regla de oro

Si añades un campo a un schema existente, hazlo **opcional** (`z.optional()`) para no romper migraciones de la BD. Los campos nuevos requeridos van en nuevos schemas.
