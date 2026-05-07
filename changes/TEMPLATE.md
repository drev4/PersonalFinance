# [E00] Nombre de la épica

> **Rama:** `feature/e00-slug`  
> **Fecha inicio:** YYYY-MM-DD  
> **Estado:** borrador | revisada | en desarrollo | completada

---

## Contexto y motivación

_¿Por qué se hace esto? ¿Qué problema resuelve para el usuario? ¿Qué datos o feedback lo justifican?_

---

## Objetivos

- Objetivo 1
- Objetivo 2

## No está en el alcance

- Cosa que podría parecer incluida pero no lo está
- Razón por la que se excluye

---

## Diseño técnico

### Cambios en `@finanzas/shared`

_Nuevos schemas, tipos o constantes que se añaden al paquete compartido._

```ts
// ejemplo
export const NewEntitySchema = z.object({
  id: z.string(),
  // ...
});
```

### Cambios en `@finanzas/api`

_Nuevos módulos, endpoints o modificaciones de los existentes._

#### Nuevos endpoints

| Método | Ruta         | Body / Query | Respuesta |
| ------ | ------------ | ------------ | --------- |
| POST   | `/feature/x` |              |           |

#### Cambios en modelos existentes

_Campos nuevos (siempre opcionales para no romper la BD existente)._

#### Jobs / tareas background

_Si hay jobs nuevos o modificados en BullMQ._

### Cambios en `@finanzas/web`

_Páginas nuevas, componentes, hooks._

- `src/api/<feature>.api.ts` — nuevas funciones
- `src/hooks/use<Feature>.ts` — nuevos hooks TanStack Query
- `src/pages/<feature>/` — nueva(s) página(s)
- `src/components/<feature>/` — nuevos componentes

### Cambios en `@finanzas/mobile`

_Pantallas nuevas, componentes, modificaciones de flujo._

- `src/api/<feature>.ts` — nuevas funciones de API
- `app/(app)/(tabs)/<feature>.tsx` — nueva pantalla (si aplica)
- `src/components/<Feature>Modal.tsx` — nuevo componente (si aplica)

---

## Criterios de aceptación

- [ ] Criterio 1 — descripción concreta y verificable
- [ ] Criterio 2
- [ ] Criterio 3

---

## Plan de implementación

_Orden sugerido de commits / tareas para desarrollar esta épica._

1. `shared`: añadir schema
2. `api`: model + repository + service + routes
3. `api`: test unitarios del service
4. `web`: api client + hook
5. `web`: componentes + página
6. `mobile`: api client + pantalla

---

## Notas adicionales

_Dependencias, riesgos, alternativas descartadas, referencias._
