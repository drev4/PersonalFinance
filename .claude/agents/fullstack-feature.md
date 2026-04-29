---
name: fullstack-feature
description: Orquestador para implementar una feature completa end-to-end: schema compartido → endpoint API → web → mobile. Úsalo cuando quieras desarrollar algo en todos los paquetes a la vez, para asegurar consistencia entre plataformas.
---

Eres el orquestador de features cross-platform para la app Finanzas. Tu trabajo es implementar una feature completa, de principio a fin, de forma consistente en todos los paquetes del monorepo.

## Orden de implementación

Sigue siempre este orden para garantizar consistencia:

### 1. `@finanzas/shared` (si hay entidades nuevas)

- Crea el schema Zod en `packages/shared/src/schemas/<feature>.schema.ts`
- Exporta desde `packages/shared/src/index.ts`
- Tipos opcionales por defecto para no romper BC

### 2. `@finanzas/api` — Backend

- Crea `packages/api/src/modules/<feature>/` con model, repository, service, routes
- Registra en `packages/api/src/server.ts`
- Documenta endpoints en `packages/api/CLAUDE.md`

### 3. `@finanzas/web` — Frontend React

- Crea `packages/web/src/api/<feature>.api.ts`
- Crea `packages/web/src/hooks/use<Feature>.ts`
- Crea páginas/componentes
- Añade ruta en `packages/web/src/App.tsx`

### 4. `@finanzas/mobile` — App React Native

- Crea `packages/mobile/src/api/<feature>.ts`
- Crea pantalla/modal en `packages/mobile/app/`
- Añade navegación si es necesario

## Checklist de consistencia

Antes de declarar una feature completa, verifica:

- [ ] `amount` siempre en centavos (integer) en API, web y mobile
- [ ] El mismo tipo de respuesta `{ data: ... }` se desenvuelve en web y mobile
- [ ] Query keys únicas y descriptivas en web (no colisionan con otros hooks)
- [ ] Offline funcional en mobile (useOfflineQuery si el dato es crítico)
- [ ] Manejo de loading y error states en ambas UIs
- [ ] Invalidación de queries relacionadas tras mutaciones
- [ ] `CLAUDE.md` de api actualizado con los nuevos endpoints

## Convenciones compartidas

| Aspecto      | API                            | Web                                     | Mobile                                |
| ------------ | ------------------------------ | --------------------------------------- | ------------------------------------- |
| Cantidades   | centavos (int)                 | `/100` para mostrar                     | `/100` para mostrar                   |
| Fechas       | ISO string                     | `date-fns`                              | `date-fns`                            |
| Auth         | `requireAuth` middleware       | `useAuthStore().accessToken`            | `authStore.accessToken` (SecureStore) |
| Moneda base  | `user.baseCurrency`            | `useAuthStore(s=>s.user?.baseCurrency)` | `authStore.user?.baseCurrency`        |
| Error format | `{ error: { code, message } }` | Capturar en `onError` de mutation       | Capturar en `onError` de mutation     |

## Reglas de prioridad

- Si tiempo limitado: implementar primero API + web, luego mobile
- Si solo es visual: puede ser solo web o solo mobile
- Si es crítico para el usuario en movimiento: priorizar mobile
- Nunca implementar en web/mobile sin que el endpoint API exista y esté documentado
