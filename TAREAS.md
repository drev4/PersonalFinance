# Tareas pendientes y funcionalidades nuevas

> Generado: 2026-04-29  
> Leyenda: `[API]` `[WEB]` `[MOB]` — paquete afectado

---

## 🔴 CRÍTICO — Roto o bloqueante

### 1. Push notifications mobile — endpoint faltante `[API]`

`useNotificationSetup.ts` en mobile llama a `POST /notifications/register-device` para registrar el token de Expo Push. Ese endpoint **no existe** en `notification.routes.ts`. Las notificaciones push al móvil nunca llegan.

- [ ] Añadir `POST /notifications/register-device` con body `{ token: string, platform: 'ios' | 'android' }`
- [ ] Guardar el token en el modelo de usuario (campo `pushTokens: string[]`)
- [ ] Usar el token en el job `notifications.job.ts` al enviar alertas

### 2. Ficheros placeholder activos en el API `[API]`

Tres ficheros con código obsoleto que no se usan y pueden confundir:

- [x] Eliminar `packages/api/src/middleware/auth.ts` (tiene `TODO: Validate JWT token here`, el real está en `middlewares/authenticate.ts`)
- [x] Eliminar `packages/api/src/services/example.service.ts`
- [x] Eliminar `packages/api/src/routes/example.routes.ts`

---

## 🟡 IMPORTANTE — Features incompletas

### Mobile — pantallas faltantes (el API ya existe, la UI no)

#### 3. Pantalla de Presupuestos `[MOB]`

El API tiene CRUD completo en `/budgets` + progreso + alertas. No hay ninguna pantalla en mobile.

- [ ] Crear `app/(app)/(tabs)/budgets.tsx` con lista de presupuestos
- [ ] Añadir la tab al layout `app/(app)/(tabs)/_layout.tsx`
- [ ] Añadir `src/api/budgets.ts` con `getBudgets`, `createBudget`, `getBudgetProgress`, `getBudgetAlerts`
- [ ] Modal de creación/edición de presupuesto
- [ ] Barra de progreso por categoría con alerta visual si supera el 80%

#### 4. Pantalla de Metas de ahorro `[MOB]`

El API tiene CRUD en `/goals` + sugerencia de aportación mensual. No hay pantalla en mobile.

- [ ] Crear `app/(app)/(tabs)/goals.tsx` con lista de metas
- [ ] Añadir la tab al layout
- [ ] Añadir `src/api/goals.ts` con `getGoals`, `createGoal`, `updateGoal`, `deleteGoal`
- [ ] Tarjeta por meta con barra de progreso circular y sugerencia mensual
- [ ] Acción rápida "Aportar" (ver tarea #19)

#### 5. Pantalla de Cuentas `[MOB]`

Las cuentas solo aparecen como scroll horizontal en el home, sin gestión.

- [ ] Crear `app/(app)/(tabs)/accounts.tsx` con lista completa
- [ ] Añadir `src/api/accounts.ts` con `getAccounts`, `createAccount`, `updateAccount`, `adjustBalance`, `archiveAccount`
- [ ] Formulario de crear/editar cuenta (tipo, moneda, saldo inicial, color, institución)
- [ ] Acción de ajustar saldo
- [ ] Swipe to archive (acción destructiva con confirmación haptic)

#### 6. Pantalla / Tab de Notificaciones `[MOB]`

`src/api/notifications.ts` existe pero no hay UI.

- [ ] Crear `app/(app)/(tabs)/notifications.tsx`
- [ ] Añadir badge en la tab con el conteo de no leídas (`GET /notifications/unread-count`)
- [ ] Lista paginada, swipe para marcar leída / eliminar
- [ ] Botón "Marcar todas como leídas"

#### 7. Settings mobile — muy incompleto `[MOB]`

Solo tiene modo oscuro + logout + debug oculto.

- [ ] Sección "Perfil": editar nombre, moneda base, idioma (llamar a `PATCH /users/me`)
- [ ] Sección "Seguridad": cambiar contraseña (`PATCH /users/me/password`)
- [ ] Sección "Notificaciones": toggle de alertas de presupuesto
- [ ] Sección "Integraciones": ver estado de Binance, conectar/desconectar
- [ ] Sección "Datos": exportar CSV, importar CSV (enlace a web si no es viable en mobile)

### Mobile — funcionalidad rota en pantallas existentes

#### 8. Filtro de fechas en transacciones no es interactivo `[MOB]`

Los chips "Desde" y "Hasta" en `transactions.tsx` muestran la fecha pero no abren ningún picker.

- [ ] Conectar `DatePickerCalendar.tsx` (ya existe en `src/components/`) al chip de fecha
- [ ] Al tocar el chip, abrir el calendario y actualizar el estado `from` / `to`

#### 9. Sin editar/eliminar en el detalle de transacción `[MOB]`

El modal de detalle solo muestra información. `EditTransactionModal.tsx` existe pero no está conectado.

- [ ] Añadir botones "Editar" y "Eliminar" en el modal de detalle (`transactions.tsx`)
- [ ] Al editar, abrir `EditTransactionModal` con los datos precargados
- [ ] Al eliminar, confirmar con `Alert` + haptic feedback destructivo

#### 10. Sin botón "+" en la tab de Transacciones `[MOB]`

No hay acceso directo para añadir transacción desde la pantalla de transacciones; solo existe el FAB del layout.

- [ ] Añadir botón "+" en el header de `transactions.tsx` que abre el quick-add modal
- [ ] O integrar el formulario directamente en la tab

#### 11. Gráfico del home es hardcoded `[MOB]`

Las barras de "Últimos 30 días" usan valores fijos `[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88]`.

- [ ] Reemplazar con datos reales de `GET /dashboard/cashflow?months=1`
- [ ] Alternativamente, usar `GET /dashboard/net-worth/history?period=1m` para evolución del patrimonio
- [ ] Mantener el skeleton mientras carga

### Web — páginas/features faltantes

#### 12. No hay UI para Reglas de Categorización `[WEB]`

El API tiene CRUD completo en `/category-rules`. Sin UI, el auto-categorizado es inaccesible.

- [ ] Crear `src/api/categoryRules.api.ts`
- [ ] Crear `src/hooks/useCategoryRules.ts`
- [ ] Crear página `src/pages/settings/CategoryRulesPage.tsx`
- [ ] Añadir ruta `/settings/category-rules` en `App.tsx`
- [ ] Añadir enlace en el sidebar de settings en `AppLayout.tsx`
- [ ] Componente para crear regla: campo `field` (descripción / monto), operador, valor, categoría destino

#### 13. No hay UI para gestionar Categorías `[WEB]`

Las categorías son solo seleccionables en formularios. No hay página dedicada.

- [ ] Crear `src/pages/settings/CategoriesPage.tsx`
- [ ] Añadir ruta `/settings/categories`
- [ ] Añadir al sidebar
- [ ] Lista con árbol (soporte `parentId`) — crear, editar nombre/color/icono, eliminar

#### 14. No hay UI para Transacciones Recurrentes `[WEB]`

El API expone `GET /transactions/recurring`, `PATCH` y `DELETE` pero no hay ninguna página.

- [ ] Añadir `src/hooks/useRecurring.ts`
- [ ] Crear `src/pages/transactions/RecurringPage.tsx` o sección dentro de `TransactionsPage`
- [ ] Lista de plantillas activas con frecuencia, próxima fecha, importe
- [ ] Acciones de pausa / editar frecuencia / cancelar

#### 15. Dark mode web — preferencia guardada pero sin efecto `[WEB]`

`preferences.theme` se persiste en BD y en Zustand pero nunca se aplica al DOM.

- [ ] En `App.tsx` o en un efecto del `authStore`, leer `user.preferences.theme` y hacer `document.documentElement.classList.toggle('dark', isDark)`
- [ ] Añadir toggle de tema en `ProfilePage.tsx` o en el header del `AppLayout`
- [ ] Verificar que los componentes Tailwind usan prefijos `dark:` donde corresponde

### API — features con modelo pero sin implementación

#### 16. 2FA — campo en modelo, sin endpoints `[API]`

`twoFactorEnabled` y `twoFactorSecret` existen en el modelo de usuario pero no hay rutas para activarlos.

- [ ] `POST /users/me/2fa/setup` — genera QR con URI TOTP y secreto
- [ ] `POST /users/me/2fa/verify` — verifica el primer código TOTP y activa 2FA
- [ ] `POST /users/me/2fa/disable` — desactiva 2FA con verificación de contraseña
- [ ] Validar código TOTP en `POST /auth/login` cuando `twoFactorEnabled: true`
- [ ] Añadir sección "Seguridad" en `ProfilePage.tsx` del web

#### 17. No existe `POST /transactions/recurring` `[API]`

Solo existen `PATCH` y `DELETE` en `/transactions/recurring`. Para crear una plantilla hay que pasar el campo `recurring` al crear una transacción, lo que genera siempre una primera transacción inmediata.

- [ ] Añadir `POST /transactions/recurring` con los campos de la plantilla (sin crear transacción real)
- [ ] Útil para programar pagos futuros sin que exista una transacción "hoy"

---

## 🟢 FUNCIONALIDADES NUEVAS

#### 18. Importación de transacciones por CSV `[API]` `[WEB]` `[MOB]`

Existe exportación CSV (`GET /reports/export`) pero no importación.

- [ ] `[API]` Añadir `POST /transactions/import-csv` — body `{ csvContent, accountId }`, devuelve `{ created, errors }`
- [ ] `[WEB]` Añadir botón "Importar CSV" en `TransactionsPage` con dialog de selección de archivo
- [ ] `[MOB]` Añadir en Settings > Datos: importar desde archivo CSV (con `expo-document-picker`)
- [ ] Soportar columnas: `date, description, amount, currency, type, category, tags`

#### 19. Depósito rápido a meta de ahorro `[API]` `[WEB]` `[MOB]`

Actualizar `currentAmount` de una meta requiere editar el objeto completo. No hay acción de "aportar".

- [ ] `[API]` Añadir `POST /goals/:id/deposit` con body `{ amount: number }` — incrementa `currentAmount`, marca `isCompleted` si llega al objetivo
- [ ] `[WEB]` Botón "Aportar" en `GoalCard.tsx` que abre un input rápido de importe
- [ ] `[MOB]` Acción rápida "Aportar" en la futura pantalla de metas

#### 20. Gestión y filtro de etiquetas (tags) `[WEB]` `[MOB]`

Las transacciones guardan `tags[]` en BD pero no hay UI para gestionarlos ni filtrar por ellos.

- [ ] `[WEB]` Añadir filtro por `tags` en `TransactionsPage` con combobox multi-selección
- [ ] `[WEB]` Mostrar tags como chips en `TransactionRow`
- [ ] `[MOB]` Añadir filtro de tags en la pantalla de transacciones
- [ ] `[WEB]` `[MOB]` Input de tags en el formulario de creación/edición de transacción (autocompletado con tags existentes)

#### 21. Vista de calendario de recurrentes `[WEB]` `[MOB]`

El endpoint `GET /dashboard/upcoming-recurring` existe. El widget del dashboard solo muestra una lista plana.

- [ ] `[WEB]` Página o modal de calendario mensual (`/transactions/calendar`) donde cada día muestre los pagos programados
- [ ] `[MOB]` Vista de semana/mes en la futura pantalla de recurrentes

#### 22. Comparativa presupuesto vs real `[WEB]` `[MOB]`

Los datos existen (budgets + spending by category) pero no hay gráfico de barras lado a lado.

- [ ] `[WEB]` Añadir chart de barras agrupadas en `BudgetsPage` — columna "Presupuestado" vs "Gastado" por categoría
- [ ] `[WEB]` También útil en `SpendingByCategoryChart` del dashboard con overlay del presupuesto total del mes
- [ ] `[MOB]` Widget similar en la futura pantalla de presupuestos

#### 23. Página de seguridad en settings web `[WEB]`

`PATCH /users/me/password` existe en el API pero no hay formulario en el web.

- [ ] Crear sección "Seguridad" en `ProfilePage` o nueva página `/settings/security`
- [ ] Formulario: contraseña actual + nueva contraseña + confirmación
- [ ] Mostrar estado de 2FA y enlace para configurarlo (cuando se implemente la tarea #16)

#### 24. Score / índice de salud financiera `[WEB]` `[MOB]`

Los datos para calcularlo ya están disponibles: ratio gasto/ingreso, % de presupuesto usado, progreso de metas, deuda/activos.

- [ ] `[API]` Añadir `GET /dashboard/health-score` — devuelve puntuación 0–100 con desglose por área
- [ ] `[WEB]` Widget en el dashboard con el score y colores semáforo
- [ ] `[MOB]` Tarjeta en el home entre el patrimonio neto y el gráfico

#### 25. Importación desde Plaid (Open Banking) `[API]`

`IntegrationTypeEnum` ya incluye `plaid` pero no hay implementación.

- [ ] Añadir `packages/api/src/modules/integrations/plaid/plaid.client.ts`
- [ ] `POST /integrations/plaid` — inicia el flujo de conexión (Link Token)
- [ ] `POST /integrations/plaid/exchange` — intercambia el token público por access token
- [ ] Sync job que importe transacciones y saldos automáticamente

#### 26. Búsqueda global `[WEB]` `[MOB]`

No hay buscador que cubra transacciones + cuentas + holdings a la vez.

- [ ] `[WEB]` Añadir `⌘K` command palette en el header del `AppLayout` con búsqueda en tiempo real
- [ ] `[MOB]` Añadir barra de búsqueda global accesible desde cualquier tab

#### 27. Simuladores en mobile `[MOB]`

El API de simuladores es público (sin auth) y tiene 5 calculadoras. No hay ninguna pantalla en mobile.

- [ ] Añadir `src/api/simulators.ts`
- [ ] Crear pantalla `app/(app)/(tabs)/simulators.tsx` con lista de calculadoras
- [ ] Implementar al menos hipoteca (`/simulators/mortgage`) e inversión (`/simulators/investment`) con formularios nativos
- [ ] Mostrar resultados con tabla de amortización simplificada

#### 28. Dividendos y rendimientos de inversiones `[API]` `[WEB]` `[MOB]`

El módulo de holdings solo rastrea PnL por precio. No hay seguimiento de dividendos ni staking.

- [ ] `[API]` Añadir `POST /holdings/:id/dividend` con `{ amount, date, currency }` — registra un ingreso de dividendo
- [ ] `[API]` `GET /holdings/:id/income` — historial de dividendos/staking de esa posición
- [ ] `[WEB]` Sección "Ingresos" en `HoldingsPage` con total de dividendos del año
- [ ] `[MOB]` Mostrar rendimiento total (PnL + dividendos) en la pantalla de cartera

---

## Resumen ejecutivo

| #   | Tarea                                 | Paquetes        | Prioridad |
| --- | ------------------------------------- | --------------- | --------- |
| 1   | Push notification endpoint            | API             | 🔴        |
| 2   | Eliminar ficheros placeholder         | API             | 🔴        |
| 3   | Pantalla Presupuestos mobile          | MOB             | 🟡        |
| 4   | Pantalla Metas mobile                 | MOB             | 🟡        |
| 5   | Pantalla Cuentas mobile               | MOB             | 🟡        |
| 6   | Pantalla Notificaciones mobile        | MOB             | 🟡        |
| 7   | Settings mobile completo              | MOB             | 🟡        |
| 8   | Filtro de fechas interactivo mobile   | MOB             | 🟡        |
| 9   | Editar/eliminar transacciones mobile  | MOB             | 🟡        |
| 10  | Botón "+" en tab Transacciones mobile | MOB             | 🟡        |
| 11  | Gráfico home con datos reales         | MOB             | 🟡        |
| 12  | UI Reglas de categorización           | WEB             | 🟡        |
| 13  | UI Gestión de categorías              | WEB             | 🟡        |
| 14  | UI Transacciones recurrentes          | WEB             | 🟡        |
| 15  | Dark mode web funcional               | WEB             | 🟡        |
| 16  | 2FA implementación                    | API             | 🟡        |
| 17  | POST /transactions/recurring          | API             | 🟡        |
| 18  | Importar transacciones CSV            | API + WEB + MOB | 🟢        |
| 19  | Depósito rápido a meta                | API + WEB + MOB | 🟢        |
| 20  | Gestión y filtro de tags              | WEB + MOB       | 🟢        |
| 21  | Calendario de recurrentes             | WEB + MOB       | 🟢        |
| 22  | Gráfico presupuesto vs real           | WEB + MOB       | 🟢        |
| 23  | Página de seguridad web               | WEB             | 🟢        |
| 24  | Score de salud financiera             | API + WEB + MOB | 🟢        |
| 25  | Integración Plaid                     | API             | 🟢        |
| 26  | Búsqueda global                       | WEB + MOB       | 🟢        |
| 27  | Simuladores mobile                    | MOB             | 🟢        |
| 28  | Dividendos y rendimientos             | API + WEB + MOB | 🟢        |
