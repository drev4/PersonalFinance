# [E02] CI/CD y calidad de código

> **Rama:** `feature/e02-cicd`  
> **Fecha inicio:** 2026-05-12  
> **Estado:** en desarrollo

---

## Contexto y motivación

No hay automatización de calidad. Un push con tipos rotos o tests fallidos puede llegar a `develop` sin que nadie lo detecte hasta el siguiente `pnpm typecheck` manual. Con el proyecto creciendo (E05, E06 ya en rama), el riesgo de regresiones silenciosas aumenta.

---

## Objetivos

- Pipeline CI que bloquee merges con lint/typecheck/tests fallidos
- Tests del paquete web que corran sin levantar el servidor API (MSW)
- Cobertura mínima documentada: API >70% en servicios, Web >50% en hooks principales

## No está en el alcance

- Tests E2E (Playwright/Cypress) — se dejan para una épica posterior
- Tests del paquete mobile — Expo requiere configuración específica
- Branch protection rules en GitHub (se configura manualmente desde la UI)

---

## Diseño técnico

### Cambios en `.github/workflows/ci.yml`

- Trigger: `push` a cualquier rama + `pull_request` a `develop` y `main`
- Jobs: `lint` → `typecheck` → (`test-api` ∥ `test-web`) → `build`
- `test-api`: necesita servicios MongoDB y Redis
- `test-web`: jsdom, sin servicios externos
- Cache de dependencias pnpm con `actions/cache` + hash del lockfile
- Badge de estado en `README.md`

### Cambios en `@finanzas/web`

- `vitest.config.ts` propio con entorno jsdom y setup de MSW
- `src/test/setup.ts` — configura `@testing-library/jest-dom` y el servidor MSW
- `src/test/handlers.ts` — handlers MSW para los endpoints usados en los hooks
- `src/test/server.ts` — instancia del servidor MSW para tests de Node
- `src/hooks/__tests__/useTransactions.test.ts`
- `src/hooks/__tests__/useDashboard.test.ts`
- `src/hooks/__tests__/useAuth.test.ts`
- Script `test` añadido a `packages/web/package.json`

### Cambios en `README.md`

- Badge `![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)`

---

## Criterios de aceptación

- [x] El CI se dispara en cada push a cualquier rama
- [x] Un PR con tests fallidos no puede mergearse (job `test-api`/`test-web` en rojo)
- [x] Los tests web corren sin servidor API levantado (MSW intercepta las llamadas)
- [x] `pnpm --filter=web test` pasa localmente en verde
- [x] Tiempo total del pipeline CI < 5 minutos

---

## Plan de implementación

1. `ci`: actualizar `.github/workflows/ci.yml`
2. `web`: instalar MSW + configurar vitest
3. `web`: setup de test (handlers, servidor MSW, jest-dom)
4. `web`: tests de `useTransactions`, `useDashboard`, `useAuth`
5. `readme`: añadir badge de CI

---

## Notas adicionales

- MSW v2 usa `http` en lugar de `rest` para definir handlers
- Los hooks usan `apiClient` (axios con baseURL `http://localhost:3001`) — en tests el interceptor de axios no entra en juego, MSW actúa a nivel de fetch/XMLHttpRequest
- El store de auth (zustand) se resetea entre tests en el setup
