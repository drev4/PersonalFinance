# Roadmap — Finanzas App

> Última actualización: 2026-05-07

---

## Flujo de desarrollo

### Antes de empezar una épica

1. Crear el fichero de spec en `changes/<epic-slug>.md` siguiendo la plantilla de `changes/TEMPLATE.md`
2. Revisar la spec y alinear el alcance antes de tocar código

### Ciclo de trabajo

```
develop
   └── feature/<epic-slug>     ← se crea desde develop
           │
           ├── commit: feat(scope): descripción
           ├── commit: feat(scope): descripción
           └── commit: fix(scope): descripción
                   │
                   ▼
           [Diego valida la funcionalidad]
                   │
                   ▼
           merge → develop
```

### Convención de ramas

```
feature/<epic-slug>      # nueva funcionalidad
fix/<descripcion-corta>  # bug fix
chore/<descripcion-corta> # tareas técnicas (CI, deps, refactor)
```

### Convención de commits (Conventional Commits)

```
feat(api): add CSV import endpoint
feat(web): add import dialog to transactions page
feat(mobile): add document picker for CSV import
fix(api): handle empty CSV gracefully
chore(ci): add GitHub Actions workflow
```

Scope sugeridos: `api`, `web`, `mobile`, `shared`, `ci`, `deps`

### Antes de hacer PR a develop

- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm test` en verde
- [ ] `pnpm lint` sin warnings nuevos
- [ ] La spec en `changes/` refleja lo que se implementó (actualizar si hubo cambios de alcance)

---

## Estado de épicas

| ID  | Épica                             | Paquetes        | Prioridad | Estado |
| --- | --------------------------------- | --------------- | --------- | ------ |
| E01 | Importación de datos              | API + WEB + MOB | 🔴 Alta   | ⏳     |
| E02 | CI/CD y calidad de código         | API + WEB + MOB | 🔴 Alta   | ⏳     |
| E03 | Deep links y notificaciones ricas | MOB             | 🟡 Media  | ⏳     |
| E04 | Análisis predictivo de gastos     | API + WEB + MOB | 🟡 Media  | ⏳     |
| E05 | Gestión de deuda                  | API + WEB + MOB | 🟡 Media  | ⏳     |
| E06 | Escaneo de recibos (OCR)          | API + MOB       | 🟡 Media  | ⏳     |
| E07 | Widgets nativos                   | MOB             | 🟢 Baja   | ⏳     |
| E08 | Onboarding y primera experiencia  | WEB + MOB       | 🟢 Baja   | ⏳     |
| E09 | Integración Open Banking (Plaid)  | API             | 🟢 Baja   | ⏳     |
| E10 | Informes avanzados y fiscalidad   | API + WEB + MOB | 🟢 Baja   | ⏳     |

Leyenda: ⏳ pendiente · 🔄 en curso · ✅ completada · 🚫 descartada

---

## E01 — Importación de datos

**Rama:** `feature/e01-data-import`  
**Spec:** `changes/e01-data-import.md`

### Contexto

La app permite exportar CSV y PDF, pero no importar datos externos. Los usuarios que vienen de otras herramientas (YNAB, Fintonic, hojas de cálculo) no pueden migrar su historial.

### Alcance

**CSV de transacciones:**

- `POST /transactions/import-csv` — body `{ csvContent, accountId }`, columnas: `date, description, amount, currency, type, category, tags`
- Parser con detección de separador (`,` o `;`) y codificación UTF-8
- Respuesta: `{ created: number, errors: [{ row, reason }] }`
- Web: botón "Importar CSV" en TransactionsPage con diálogo de previsualización (primeras 5 filas antes de confirmar)
- Mobile: Settings > Datos > "Importar transacciones" con `expo-document-picker`

**Plaid (Open Banking):**

- `POST /integrations/plaid` — inicia flujo con Link Token
- `POST /integrations/plaid/exchange` — intercambia token público por access token
- Job de sync que importa transacciones y saldos automáticamente (BullMQ, cada 6h)
- Web: card de integración Plaid en la página de integraciones (igual que Binance)

### Criterios de aceptación

- Importar 500 transacciones de un CSV en menos de 3 segundos
- Filas con errores de formato no bloquean el resto de la importación
- El usuario ve cuántas filas se importaron y cuántas fallaron, con el motivo por fila
- La conexión Plaid sobrevive a un refresh de token (re-auth automática)

---

## E02 — CI/CD y calidad de código

**Rama:** `feature/e02-cicd`  
**Spec:** `changes/e02-cicd.md`

### Contexto

No hay automatización de calidad. Un push con tipos rotos o tests fallidos puede llegar a `develop` sin que nadie lo detecte hasta el siguiente `pnpm typecheck` manual.

### Alcance

**GitHub Actions:**

- Workflow `ci.yml` disparado en cada push a cualquier rama y en cada PR a `develop`
- Jobs: `lint` → `typecheck` → `test` (en paralelo para api y web)
- Cache de dependencias pnpm entre runs
- Badge de estado en el README

**Tests del paquete web:**

- Configurar `msw` (Mock Service Worker) para mock del API en tests
- Tests de hooks con `@testing-library/react` + `renderHook`: `useTransactions`, `useDashboard`, `useAuth`
- Tests de flujo crítico: login → dashboard → crear transacción

**Cobertura mínima (meta inicial):**

- API: mantener >70% en servicios
- Web: alcanzar >50% en hooks principales

### Criterios de aceptación

- Un PR con `pnpm test` fallando no puede mergearse (branch protection)
- Tiempo total del pipeline CI < 5 minutos
- Los tests del web corren sin necesidad de un servidor API levantado

---

## E03 — Deep links y notificaciones ricas

**Rama:** `feature/e03-deep-links`  
**Spec:** `changes/e03-deep-links.md`

### Contexto

Las notificaciones push llegan correctamente pero al tocarlas siempre abren la app en la pantalla inicial. No hay forma de navegar directo al contexto relevante (presupuesto superado → pantalla de presupuestos).

### Alcance

**Backend:**

- Añadir campo `deepLink` al payload de notificación en `push.service.ts`
- Mapeo por tipo: `budget_alert → /(tabs)/budgets`, `price_alert → /(tabs)/portfolio`, `goal_achieved → /(tabs)/goals`, `recurring_due → /(tabs)/recurring`

**Mobile:**

- `useNotificationSetup.ts`: manejar `addNotificationResponseReceivedListener` y navegar a la ruta del `deepLink`
- Notificaciones ricas (iOS): imagen de preview, botones de acción rápida ("Ver", "Ignorar")
- Badge de la app con número de notificaciones no leídas (sincronizado con `notificationStore`)

**Web:**

- Panel de notificaciones muestra acciones contextuales según el tipo (botón "Ver presupuesto", "Ver cartera", etc.)

### Criterios de aceptación

- Tocar una notificación de alerta de presupuesto lleva a la pantalla de presupuestos en < 1 segundo
- El badge del icono de la app se actualiza al recibir / leer notificaciones
- Los deep links funcionan también cuando la app está cerrada (cold start)

---

## E04 — Análisis predictivo de gastos

**Rama:** `feature/e04-spending-insights`  
**Spec:** `changes/e04-spending-insights.md`

### Contexto

La app muestra gastos históricos pero no ayuda al usuario a entender tendencias ni a anticipar su situación futura. El health score da una puntuación pero sin orientación accionable.

### Alcance

**Backend:**

- `GET /dashboard/spending-forecast` — proyección del gasto del mes actual basada en la media de los últimos 3 meses y el ritmo actual
- `GET /dashboard/insights` — lista de observaciones generadas (ej: "Gastas un 40% más en Restaurantes que el mes anterior", "A este ritmo superarás el presupuesto de Ocio en 5 días")
- Algoritmo de detección de anomalías: transacciones que superan 2σ de la media de la categoría

**Web:**

- Sección "Análisis" en el dashboard con: forecast del mes, card de insights (scrollable), gráfico de tendencia por categoría (últimos 6 meses)
- Comparativa mes actual vs mismo mes del año anterior

**Mobile:**

- Widget de insight del día en el dashboard (card con la observación más relevante)
- Pantalla de análisis en la tab de Informes con gráficos de tendencia

### Criterios de aceptación

- El forecast tiene un error medio < 15% comparado con el gasto real final del mes (validado a posteriori)
- Los insights se generan en < 500ms
- El usuario puede descartar un insight ("No me interesa este análisis")

---

## E05 — Gestión de deuda

**Rama:** `feature/e05-debt-management`  
**Spec:** `changes/e05-debt-management.md`

### Contexto

Las cuentas de tipo `loan`, `mortgage` y `credit_card` existen pero la app no ofrece ninguna herramienta para gestionar la deuda activamente. Los simuladores de hipoteca y amortización anticipada están desconectados de las cuentas reales del usuario.

### Alcance

**Backend:**

- `GET /accounts/debt-summary` — resumen de todas las cuentas de deuda: saldo pendiente, tipo de interés, cuota mensual, fecha fin estimada
- `POST /accounts/:id/debt-config` — configurar tipo de interés y cuota mensual de una cuenta de deuda
- `GET /accounts/:id/payoff-plan` — plan de amortización con estrategias: mínimo, avalancha (mayor interés primero), bola de nieve (menor deuda primero)
- Integrar con los simuladores existentes: enlazar resultados del simulador a la cuenta real

**Web:**

- Página `/accounts/debt` con resumen de deudas, deuda total, cuota mensual total, fecha de libertad financiera estimada
- Comparativa visual de estrategias de amortización (avalancha vs bola de nieve)
- Botón "Simular amortización anticipada" que pre-rellena el simulador con datos de la cuenta

**Mobile:**

- Sección "Deudas" en la pantalla de cuentas
- Detalle de cuenta de deuda: progreso de amortización, próxima cuota, opción de ver plan

### Criterios de aceptación

- El plan de amortización coincide con los resultados del simulador de préstamo para los mismos parámetros
- El usuario puede comparar visualmente cuánto ahorra con la estrategia avalancha vs mínimos
- Conectar una cuenta real al simulador no requiere rellenar los datos dos veces

---

## E06 — Escaneo de recibos (OCR)

**Rama:** `feature/e06-receipt-scan`  
**Spec:** `changes/e06-receipt-scan.md`

### Contexto

Registrar un gasto manualmente requiere recordar importe, comercio, categoría y fecha. Fotografiar el ticket es la forma más natural de capturar un gasto en el momento.

### Alcance

**Backend:**

- `POST /transactions/scan-receipt` — acepta imagen en base64, devuelve `{ amount, date, merchant, suggestedCategory }` extraídos por OCR
- Integración con un servicio OCR (Google Vision API o Tesseract local como fallback)
- El endpoint no crea la transacción, solo extrae los datos para que el usuario los confirme

**Mobile:**

- Botón "Escanear ticket" en `QuickAddModal` y en la fab de la pantalla de transacciones
- Flujo: cámara → preview → datos extraídos rellenados en el formulario → usuario confirma/corrige → crea transacción
- Usar `expo-camera` y `expo-image-picker`

### Criterios de aceptación

- El OCR extrae el importe con precisión > 85% en tickets estándar de supermercado y restaurante
- El flujo completo (foto → transacción creada) en menos de 10 segundos
- Si el OCR no extrae un campo, ese campo queda vacío para que el usuario lo rellene (nunca rellena datos incorrectos)

---

## E07 — Widgets nativos

**Rama:** `feature/e07-widgets`  
**Spec:** `changes/e07-widgets.md`

### Contexto

Una app de finanzas personales tiene más valor si el usuario puede ver su estado financiero de un vistazo desde la pantalla de inicio, sin abrir la app.

### Alcance

**iOS (WidgetKit):**

- Widget pequeño: saldo total de cuentas o gasto del mes
- Widget mediano: patrimonio neto + últimas 3 transacciones
- Configuración: el usuario elige qué cuenta o métrica mostrar en el widget

**Android (Glance):**

- Widget equivalente al iOS mediano

**Actualización de datos:**

- Los widgets se actualizan cada 30 minutos o al abrir la app
- Los datos se sirven desde el mismo endpoint `/dashboard/net-worth`

### Criterios de aceptación

- El widget se actualiza en < 5 minutos tras una nueva transacción
- El widget funciona sin conexión mostrando el último dato cacheado
- La configuración del widget persiste entre reinicios del dispositivo

---

## E08 — Onboarding y primera experiencia

**Rama:** `feature/e08-onboarding`  
**Spec:** `changes/e08-onboarding.md`

### Contexto

Tras el registro, el usuario llega a un dashboard vacío sin orientación. No sabe qué hacer primero ni entiende el valor de cada sección. La curva de activación es larga.

### Alcance

**Web + Mobile:**

- Flujo de onboarding post-registro: 4 pasos guiados (crear primera cuenta, añadir primera transacción, crear primer presupuesto, configurar moneda base)
- Progress stepper visible, cada paso es opcional pero incentivado
- Checklist de "primeros pasos" en el dashboard (dismissible) hasta completar el onboarding
- Estado vacío con ilustración y CTA en cada sección (transacciones vacías → "Añade tu primera transacción")

**Backend:**

- `GET /users/me/onboarding-status` — devuelve qué pasos ha completado el usuario
- `PATCH /users/me/onboarding-status` — marca pasos completados

### Criterios de aceptación

- Un usuario nuevo tarda < 3 minutos en tener su primera cuenta y transacción registradas siguiendo el onboarding
- El onboarding no bloquea el acceso libre a la app (siempre se puede saltar)
- Los estados vacíos de cada sección tienen CTA contextual que lleva directamente a crear el primer elemento

---

## E09 — Integración Open Banking (Plaid)

**Rama:** `feature/e09-open-banking`  
**Spec:** `changes/e09-open-banking.md`

### Contexto

`IntegrationTypeEnum` ya incluye `plaid` pero no hay implementación. La importación manual de movimientos es el mayor punto de fricción de la app. La sincronización automática con el banco eliminaría ese fricción por completo.

### Alcance

- `POST /integrations/plaid` — inicia flujo Plaid Link (genera `link_token`)
- `POST /integrations/plaid/exchange` — intercambia `public_token` por `access_token` (cifrado en BD)
- `POST /integrations/:id/sync` — sincronización manual
- Job BullMQ `plaidSync` — sincronización automática cada 6 horas
- Deduplicación por `externalId` para no crear transacciones duplicadas
- Web: flujo de conexión bancaria en la página de Integraciones con Plaid Link (iframe)

### Criterios de aceptación

- La conexión bancaria no almacena credenciales del banco (solo el token de Plaid)
- Los movimientos importados automáticamente aparecen en < 1 hora tras ocurrir en el banco
- Si el token caduca, se notifica al usuario y se solicita re-autenticación
- Los duplicados no se crean aunque el sync se ejecute varias veces

---

## E10 — Informes avanzados y fiscalidad

**Rama:** `feature/e10-advanced-reports`  
**Spec:** `changes/e10-advanced-reports.md`

### Contexto

Los informes actuales son mensuales y anuales (PDF genérico) y exportación CSV plana. Los usuarios con inversiones y múltiples cuentas necesitan informes más ricos: evolución del patrimonio, rendimiento de cartera, resumen de plusvalías.

### Alcance

**Backend:**

- `GET /reports/net-worth-evolution` — CSV/PDF con evolución mensual del patrimonio neto del último año
- `GET /reports/portfolio-performance` — rendimiento de la cartera: PnL por activo, dividendos recibidos, rentabilidad total
- `GET /reports/capital-gains` — resumen de plusvalías realizadas y no realizadas (útil para declaración de impuestos)
- `GET /reports/category-breakdown?year=2025` — desglose anual de gastos por categoría con comparativa mensual

**Web:**

- Página de Informes rediseñada con secciones: Mensuales, Anuales, Cartera, Fiscal
- Vista previa del PDF antes de descargar
- Selector de rango de fechas libre (no solo mensual/anual)

**Mobile:**

- Compartir informes vía `expo-sharing`
- Informes de cartera integrados en la pantalla de Portfolio

### Criterios de aceptación

- El informe anual completo (1 año de datos, 1000 transacciones) se genera en < 10 segundos
- El informe de plusvalías distingue correctamente entre FIFO y LIFO (configurable por usuario)
- Los PDFs son accesibles (texto seleccionable, no imagen escaneada)
