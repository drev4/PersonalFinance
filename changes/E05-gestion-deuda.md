# [E05] Gestión de deuda

> **Rama:** `feature/e05-gestion-deuda`  
> **Fecha inicio:** 2026-05-07  
> **Estado:** completada

---

## Contexto y motivación

El usuario necesita registrar y hacer seguimiento de sus deudas (hipotecas, préstamos, tarjetas de crédito) para que formen parte del cálculo de patrimonio neto y del health score. Sin este módulo, el net worth estaba sobrestimado porque no se descontaban los pasivos, y el índice de salud financiera no podía medir el ratio de deuda.

---

## Objetivos

- Registrar deudas con importe original, saldo actual, tasa de interés y pago mínimo mensual
- Calcular automáticamente meses hasta liquidación e interés total estimado (fórmula de amortización estándar)
- Integrar las deudas en el cálculo de patrimonio neto (pasivos) y en el health score
- Invalidar la caché de net worth en cada mutación de deuda que afecte al saldo
- Mostrar estrategias de pago Avalanche y Snowball en la vista web
- Toggle Neto / Activos / Pasivos en la tarjeta de patrimonio (web y móvil)

## No está en el alcance

- Sincronización automática con bancos o agregadores financieros
- Historial de pagos registrados (solo se actualiza el saldo actual)
- Alertas push cuando se acerca la fecha de próximo pago

---

## Diseño técnico

### Cambios en `@finanzas/shared`

```ts
export const DebtTypeEnum = z.enum([
  'credit_card',
  'personal_loan',
  'mortgage',
  'student_loan',
  'car_loan',
  'other',
]);

export const DebtInfoSchema = z.object({
  paidAmount: z.number(),
  percentPaid: z.number(),
  monthsToPayoff: z.number().nullable(),
  totalInterestEstimate: z.number().nullable(),
  monthlyInterestCharge: z.number().nullable(),
});

export const DebtSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: DebtTypeEnum,
  currency: z.string(),
  originalAmount: z.number(), // centavos
  currentBalance: z.number(), // centavos
  interestRate: z.number(), // porcentaje anual (ej. 12.5)
  minimumPayment: z.number(), // centavos/mes
  nextPaymentDate: z.string().optional(),
  notes: z.string().optional(),
  color: z.string().optional(),
  isPaidOff: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

### Cambios en `@finanzas/api`

#### Nuevos endpoints

| Método | Ruta                 | Body / Query         | Respuesta           |
| ------ | -------------------- | -------------------- | ------------------- |
| GET    | `/debts`             | —                    | `Debt[]`            |
| POST   | `/debts`             | `CreateDebtDTO`      | `Debt`              |
| GET    | `/debts/:id`         | —                    | `Debt`              |
| PATCH  | `/debts/:id`         | `UpdateDebtDTO`      | `Debt`              |
| DELETE | `/debts/:id`         | —                    | `{ success: true }` |
| POST   | `/debts/:id/payment` | `{ amount: number }` | `Debt`              |

#### Nuevos módulos

- `packages/api/src/modules/debts/debt.model.ts` — Mongoose model con índices compuestos en `{userId, isActive, isPaidOff}` y `{userId, isPaidOff, updatedAt}`
- `packages/api/src/modules/debts/debt.repository.ts` — `findByUser` (activas + pagadas últimos 30 días), `findById`, `create`, `update`, `deactivate`
- `packages/api/src/modules/debts/debt.service.ts` — `calculateDebtInfo` (fórmula de amortización: `n = -ln(1 - r·PV/PMT) / ln(1+r)`), CRUD + `makePayment`
- `packages/api/src/modules/debts/debt.routes.ts` — registro de rutas Fastify con validación Zod

#### Cambios en módulos existentes

**`dashboard.service.ts`**

- `getNetWorth()`: añade fetch paralelo de `DebtModel` (deudas activas no pagadas), suma `currentBalance` a `liabilities` y `breakdown.debts`
- `takeSnapshotsForAllUsers()`: unifica user IDs de `AccountModel.distinct` + `DebtModel.distinct` para no perder usuarios sin cuentas pero con deudas
- Todos los servicios de deuda llaman `void invalidateNetWorthCache(userId)` tras mutaciones que afecten al saldo

### Cambios en `@finanzas/web`

- `src/api/debts.api.ts` — cliente REST (get, create, update, pay, delete)
- `src/hooks/useDebts.ts` — hooks TanStack Query con `debtKeys`
- `src/pages/debts/DebtsPage.tsx` — SummaryBar, selector de estrategia Avalanche/Snowball, grid de deudas activas, sección colapsable de pagadas
- `src/components/debts/DebtCard.tsx` — barra de progreso, stats grid, caja de amortización (azul/rojo según si el pago cubre intereses), fecha próximo pago, menú kebab
- `src/components/debts/DebtFormDialog.tsx` — formulario con color picker y validación Zod
- `src/components/debts/DebtPaymentDialog.tsx` — registrar pago con preview de nuevo saldo
- `src/components/dashboard/NetWorthCard.tsx` — toggle Activos / Neto / Pasivos; la variación mensual solo se muestra en modo Neto

### Cambios en `@finanzas/mobile`

- `src/api/debts.ts` — tipos + hooks TanStack Query + `TYPE_LABELS`
- `src/components/DebtFormModal.tsx` — modal full-screen con chips de tipo, DatePickerCalendar y selector de color
- `app/(app)/(tabs)/debts.tsx` — `PaymentSheet` (bottom sheet), `DebtCard` (chips de stats, chip de aviso), `DebtsScreen` (tarjeta resumen con progreso, empty state)
- `app/(app)/(tabs)/_layout.tsx` — pantalla `debts` registrada con `href: null` (acceso desde menú Más)
- `app/(app)/(tabs)/more.tsx` — ítem "Deudas" en sección Finanzas
- `app/(app)/(tabs)/index.tsx` — toggle Activos / Neto / Pasivos en tarjeta de patrimonio neto; `DashboardSummary` expone `netWorthAssets` y `netWorthLiabilities`

---

## Criterios de aceptación

- [x] Crear, editar y eliminar deudas desde web y móvil
- [x] Registrar un pago reduce el saldo actual; llegar a 0 marca `isPaidOff = true`
- [x] Las deudas activas aparecen en `liabilities` del endpoint `/dashboard/net-worth`
- [x] El health score incluye el ratio de deuda sobre activos
- [x] La caché Redis de net worth se invalida tras cualquier mutación de saldo
- [x] `calculateDebtInfo` devuelve `monthsToPayoff: null` cuando el pago mínimo no supera los intereses
- [x] 21 tests unitarios pasando en `debt.service.test.ts`
- [x] Toggle Activos / Neto / Pasivos funciona en dashboard web y móvil; default = Activos

---

## Plan de implementación

1. `shared`: DebtTypeEnum + DebtInfoSchema + DebtSchema
2. `api`: debt.model + debt.repository
3. `api`: debt.service + calculateDebtInfo
4. `api`: debt.routes + registro en server.ts
5. `api`: debt.service.test.ts (21 tests)
6. `api`: integración en dashboard.service (liabilities + snapshots + cache)
7. `web`: api client + hooks + tipos
8. `web`: DebtCard + DebtFormDialog + DebtPaymentDialog + DebtsPage
9. `web`: ruta /debts + nav sidebar + NetWorthCard toggle
10. `mobile`: api/debts.ts + DebtFormModal
11. `mobile`: debts.tsx + layout + menú Más
12. `mobile`: toggle Activos/Neto/Pasivos en index.tsx

---

## Notas adicionales

- Los importes siempre se almacenan en **centavos** (enteros), excepto `interestRate` que es float (ej. `12.5` = 12.5 % anual).
- Soft-delete consistente con el patrón del resto del proyecto (`isActive: false`).
- `findByUser` devuelve deudas activas + deudas pagadas en los últimos 30 días para que la UI pueda mostrar el historial reciente sin cargar todo.
