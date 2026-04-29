# Quick Start - Finanzas App

## 1. Instalación (5 minutos)

```bash
# Clonar/acceder al proyecto
cd /Users/diego/Documents/Fintech/finanzas-app

# Instalar todas las dependencias
pnpm install

# Configurar variables de entorno
cp packages/api/.env.example packages/api/.env
# Edita el archivo .env con tus valores de MONGO_URI, REDIS_URL, etc.
```

## 2. Iniciar Desarrollo (10 segundos)

```bash
# Terminal única - ejecuta API + Web en paralelo
pnpm dev
```

Luego abre en tu navegador:

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Health check: http://localhost:3001/health

## 3. Que se Incluye

### ✅ Configuración Completa

- ESLint + Prettier (formateado automático)
- TypeScript estricto (sin `any` permitido)
- Husky + lint-staged (validación pre-commit)
- Vitest para testing

### ✅ Backend (Fastify)

- Servidor con CORS, helmet, rate-limiting
- Validación de variables de entorno con Zod
- Ejemplo de rutas y middlewares
- Listo para MongoDB + Redis

### ✅ Frontend (React + Vite)

- React Router para navegación
- Zustand para estado global
- TanStack React Query para data fetching
- Tailwind CSS + componentes base
- Formatters y hooks listos

### ✅ Tipos Compartidos (@finanzas/shared)

- Schemas Zod completos para:
  - Users, Accounts, Transactions
  - Categories, Rules, Budgets
  - Holdings, Integrations
  - Simulations, Price/NetWorth Snapshots
- Constantes (monedas, bolsas, categorías default)
- Tipos TypeScript automáticamente inferidos

## 4. Comandos Útiles

```bash
pnpm dev              # Ejecutar todo
pnpm lint             # Validar código
pnpm typecheck        # Verificar tipos
pnpm build            # Compilar para producción
pnpm test             # Ejecutar tests
```

## 5. Crear Nuevo Endpoint

En `packages/api/src/routes/`, crear archivo como `users.routes.ts`:

```typescript
import { FastifyInstance } from 'fastify';
import { UserSchema, type User } from '@finanzas/shared';

export const registerUserRoutes = async (fastify: FastifyInstance) => {
  fastify.get<{ Reply: { message: string } }>('/users', async (request, reply) => {
    return reply.send({ message: 'Users endpoint' });
  });
};
```

Luego registrarlo en `packages/api/src/server.ts`:

```typescript
import { registerUserRoutes } from './routes/users.routes.js';

// En la función start(), antes de escuchar:
await registerUserRoutes(fastify);
```

## 6. Crear Componente React

En `packages/web/src/components/`, crear archivo como `UserCard.tsx`:

```typescript
import type { User } from '@finanzas/shared';

interface UserCardProps {
  user: User;
}

export const UserCard: React.FC<UserCardProps> = ({ user }) => (
  <div className="p-4 border rounded-lg">
    <h3 className="font-bold">
      {user.firstName} {user.lastName}
    </h3>
    <p className="text-sm text-gray-600">{user.email}</p>
  </div>
);
```

## 7. Próximos Pasos

1. **Configura la BD:**

   - MongoDB local o MongoDB Atlas
   - Redis local o Redis Cloud
   - Actualiza `packages/api/.env`

2. **Implements autenticación:**

   - Middleware en `packages/api/src/middleware/auth.ts`
   - Schemas de login en `@finanzas/shared`

3. **Crea entidades:**

   - Schema en `packages/shared`
   - Rutas en `packages/api`
   - Componentes en `packages/web`

4. **Tests:**
   - `pnpm test` para Vitest
   - Escribe tests mientras desarrollas

## Estructura de Directorios

```
finanzas-app/
├── packages/
│   ├── shared/src/
│   │   ├── schemas/         ← Zod schemas
│   │   ├── constants/       ← CURRENCIES, DEFAULT_CATEGORIES, etc
│   │   └── index.ts         ← Exporta todo
│   ├── api/src/
│   │   ├── server.ts        ← Punto de entrada
│   │   ├── routes/          ← Endpoints
│   │   ├── middleware/      ← Autenticación, etc
│   │   └── services/        ← Lógica de negocio
│   └── web/src/
│       ├── main.tsx         ← Punto de entrada
│       ├── components/      ← Componentes React
│       ├── hooks/           ← Custom hooks
│       ├── stores/          ← Zustand stores
│       └── utils/           ← Helpers
└── .eslintrc.cjs, .prettierrc, tsconfig.base.json
```

## Desarrollo Sin Instalación Local

Si no tienes MongoDB/Redis localmente:

1. Usa Docker:

   ```bash
   docker-compose up -d
   ```

2. O usa servicios cloud:
   - MongoDB Atlas (gratis)
   - Redis Cloud (gratis)
   - Actualiza `.env` con los URLs

## Debugging

- **API:** `pnpm --filter @finanzas/api dev` (logs en terminal)
- **Web:** Abre DevTools (F12) → React tab
- **Types:** `pnpm typecheck` muestra errores TypeScript

## Documentación

- `README.md` - Visión general
- `DEVELOPMENT.md` - Guía completa
- `QUICKSTART.md` - Este archivo

¡Listo! Empieza a desarrollar con `pnpm dev`
