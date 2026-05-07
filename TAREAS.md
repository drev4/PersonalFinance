# Tareas pendientes y funcionalidades nuevas

> Actualizado: 2026-05-07  
> Leyenda: `[API]` `[WEB]` `[MOB]` — paquete afectado  
> Estado: ⏳ pendiente · 🔄 en curso · ✅ hecho

---

## 🔴 CRÍTICO

### 1. 2FA — campo en modelo, sin endpoints `[API]` `[WEB]`

`twoFactorEnabled` y `twoFactorSecret` existen en el modelo pero no hay rutas.

- [ ] `POST /users/me/2fa/setup` — genera QR con URI TOTP y secreto
- [ ] `POST /users/me/2fa/verify` — verifica primer código y activa 2FA
- [ ] `POST /users/me/2fa/disable` — desactiva con contraseña actual
- [ ] Validar código TOTP en `POST /auth/login` cuando `twoFactorEnabled: true`
- [ ] Añadir sección "Seguridad" en `ProfilePage.tsx` del web con estado 2FA y setup wizard

---

## 🟡 IMPORTANTE

### 2. Página de seguridad web — cambio de contraseña `[WEB]`

`PATCH /users/me/password` existe en el API pero no hay formulario.

- [ ] Crear sección "Seguridad" en `ProfilePage` o página `/settings/security`
- [ ] Formulario: contraseña actual + nueva + confirmación
- [ ] Enlace "Configurar 2FA" cuando se implemente la tarea #1

### 3. Importación de transacciones por CSV `[API]` `[WEB]` `[MOB]`

Existe exportación CSV pero no importación.

- [ ] `[API]` `POST /transactions/import-csv` — body `{ csvContent, accountId }`, devuelve `{ created, errors }`
- [ ] `[API]` Soportar columnas: `date, description, amount, currency, type, category, tags`
- [ ] `[WEB]` Botón "Importar CSV" en `TransactionsPage` con `ImportCsvDialog`
- [ ] `[MOB]` Settings > Datos: importar desde archivo con `expo-document-picker`

### 4. Dividendos y rendimientos de inversiones `[API]` `[WEB]` `[MOB]` ✅

Holdings solo rastrea PnL por precio. No hay seguimiento de dividendos ni staking.

- [x] `[API]` `POST /holdings/:id/dividend` con `{ amount, date, currency }` — registra ingreso
- [x] `[API]` `GET /holdings/:id/income` — historial de dividendos de esa posición
- [x] `[WEB]` Sección "Ingresos" en `HoldingsPage` con total de dividendos del año
- [x] `[MOB]` Rendimiento total (PnL + dividendos) en pantalla de cartera

### 5. Pantalla de detalle de cuenta mobile `[MOB]` ✅

La web tiene `AccountDetailPage` con historial y ajuste de saldo. En mobile solo existe la lista.

- [x] Crear `app/(app)/account-detail.tsx` con saldo actual, historial de movimientos filtrados y acciones
- [x] Navegar desde la tarjeta de cuenta en `accounts.tsx`
- [x] Reutilizar ajuste de saldo (bottom sheet) y edición (AccountFormModal)

### 6. Pantalla de Informes mobile `[MOB]` ✅

La web tiene `ReportsPage` con exportación CSV y estadísticas mensuales. Mobile no tiene nada.

- [x] Añadir hook `useSpendingByCategory` en `src/api/dashboard.ts` con filtro por rango de fechas
- [x] Crear pantalla `reports.tsx` accesible desde el hub "Más": resumen mensual, gráfico cashflow y desglose por categoría
- [ ] Exportación CSV con `expo-sharing`

### 7. Alertas de precio en cartera `[API]` `[WEB]` `[MOB]` ✅

El tipo de notificación `price_alert` existe pero no hay forma de configurar alertas.

- [x] `[API]` `POST /holdings/:id/price-alert` con `{ targetPrice, direction: 'above' | 'below' }`
- [x] `[API]` Evaluar alertas en job cron cada 15 min al actualizar precios
- [x] `[WEB]` Botón Bell en `HoldingRow.tsx` abre `PriceAlertDialog` con lista y formulario de creación
- [x] `[MOB]` Botón Bell por holding con modal de alertas activas/pausadas y formulario

---

## 🟢 NUEVAS FUNCIONALIDADES

### 8. Integración Plaid (Open Banking) `[API]`

`IntegrationTypeEnum` ya incluye `plaid` pero no hay implementación.

- [ ] Crear `packages/api/src/modules/integrations/plaid/plaid.client.ts`
- [ ] `POST /integrations/plaid` — inicia flujo (Link Token)
- [ ] `POST /integrations/plaid/exchange` — intercambia token público por access token
- [ ] Job de sync que importe transacciones y saldos automáticamente

### 9. Autenticación biométrica mobile `[MOB]` ✅

Fintech habitual: bloquear la app con Face ID / huella.

- [x] Instalar `expo-local-authentication`
- [x] Toggle en Settings: "Usar biometría para abrir la app"
- [x] Al entrar desde background, pedir autenticación biométrica antes de mostrar contenido
- [x] Guardar preferencia en `configStore.ts`

### 10. Tests del paquete web `[WEB]`

`packages/web` solo tiene `App.test.tsx`. El API tiene tests por módulo, la web no.

- [ ] Añadir tests de renderizado para los hooks principales (`useTransactions`, `useDashboard`, etc.)
- [ ] Tests de integración para los flujos críticos: login, crear transacción, ver dashboard
- [ ] Configurar `msw` para mock de la API en tests

### 11. Infinite scroll / paginación en listas mobile `[MOB]` ✅

`transactions.tsx` carga todo de golpe. Con muchos datos la lista se ralentiza.

- [x] Implementar `useInfiniteQuery` en `src/api/transactions.api.ts`
- [x] Pasar a `FlatList` con `onEndReached` para cargar siguiente página
- [ ] Aplicar el mismo patrón en `notifications.tsx`

### 12. Pipeline CI/CD `[API]` `[WEB]` `[MOB]`

No hay `.github/workflows`. Cada push al repo no valida automáticamente.

- [ ] Crear `.github/workflows/ci.yml`: lint + typecheck + tests en cada PR
- [ ] Separar job de build para web y API
- [ ] Badge de estado en el README

### 13. Selector de moneda en transacciones multi-cuenta `[WEB]` `[MOB]`

Si una cuenta es en USD y otra en EUR, la transferencia entre ellas no tiene campo de tipo de cambio.

- [ ] `[API]` Añadir campo `exchangeRate` en `TransactionSchema` para transferencias inter-moneda
- [ ] `[WEB]` Mostrar campo de tipo de cambio en `TransferFormDialog` cuando las monedas difieren
- [ ] `[MOB]` Igual en `QuickAddModal` para transferencias

### 14. Deep links y notificaciones con navegación `[MOB]`

Las push notifications llegan pero al tocarlas abren la app en la pantalla inicial, sin navegar al contenido relevante.

- [ ] Añadir campo `deepLink` al payload de notificación en `push.service.ts`
- [ ] En `useNotificationSetup.ts`, manejar `addNotificationResponseReceivedListener` y navegar a la ruta
- [ ] Ejemplos: notificación de presupuesto → navegar a `/(tabs)/budgets`, alerta de precio → `/(tabs)/portfolio`

### 15. Modo oscuro mobile (dark theme) `[MOB]` ✅

El tema en mobile tiene colores definidos pero el toggle solo alterna en web. En mobile `useTheme` siempre devuelve el tema claro.

- [x] En `useTheme.ts` y/o `_layout.tsx`, leer `useColorScheme()` del sistema y propagar vía `configStore`
- [x] Propagar el tema al `configStore` para persistirlo localmente (toggle manual + "Seguir sistema")
- [x] Verificar que todos los componentes usan `c.bg`, `c.card`, etc. en lugar de colores hardcoded

---

## Resumen ejecutivo

| #   | Tarea                                  | Paquetes        | Prioridad | Estado |
| --- | -------------------------------------- | --------------- | --------- | ------ |
| 1   | 2FA completo                           | API + WEB       | 🔴        | ✅     |
| 2   | Página seguridad web (cambio password) | WEB             | 🟡        | ✅     |
| 3   | Importar transacciones CSV             | API + WEB + MOB | 🟡        | ⏳     |
| 4   | Dividendos y rendimientos              | API + WEB + MOB | 🟡        | ✅     |
| 5   | Detalle de cuenta mobile               | MOB             | 🟡        | ✅     |
| 6   | Pantalla Informes mobile               | MOB             | 🟡        | ✅     |
| 7   | Alertas de precio en cartera           | API + WEB + MOB | 🟡        | ✅     |
| 8   | Integración Plaid                      | API             | 🟢        | ⏳     |
| 9   | Autenticación biométrica mobile        | MOB             | 🟢        | ✅     |
| 10  | Tests paquete web                      | WEB             | 🟢        | ⏳     |
| 11  | Infinite scroll listas mobile          | MOB             | 🟢        | ✅     |
| 12  | Pipeline CI/CD                         | API + WEB + MOB | 🟢        | ⏳     |
| 13  | Tipo de cambio en transferencias       | API + WEB + MOB | 🟢        | ✅     |
| 14  | Deep links desde notificaciones        | MOB             | 🟢        | ⏳     |
| 15  | Dark mode mobile                       | MOB             | 🟢        | ✅     |
