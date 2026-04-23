# Guía de Desarrollo - Finanzas App

## Instalación Inicial

```bash
# 1. Navega al directorio del monorepo
cd /Users/diego/Documents/Fintech/finanzas-app

# 2. Instala las dependencias con pnpm
pnpm install

# 3. Configura las variables de entorno
cp packages/api/.env.example packages/api/.env

# 4. Edita el archivo .env con tus valores
# Editor de tu preferencia: VS Code, nano, vim, etc.
# Requiere valores para: MONGO_URI, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY
```

## Iniciar el Desarrollo

### Opción 1: Ejecutar todo en paralelo
```bash
pnpm dev
```

Esto ejecutará simultáneamente:
- API en http://localhost:3001
- Web en http://localhost:5173

### Opción 2: Ejecutar servicios individuales
```bash
# Terminal 1 - Backend
pnpm --filter @finanzas/api dev

# Terminal 2 - Frontend
pnpm --filter @finanzas/web dev
```

## Estructura de Directorios

```
finanzas-app/
├── packages/
│   ├── shared/                    # Tipos y schemas compartidos
│   │   └── src/
│   │       ├── schemas/           # Schemas Zod para cada entidad
│   │       ├── types/            # Tipos TypeScript inferidos
│   │       ├── constants/        # Constantes (monedas, categorías)
│   │       └── index.ts          # Re-exporta todo
│   │
│   ├── api/                       # Backend Fastify
│   │   └── src/
│   │       ├── server.ts         # Punto de entrada
│   │       ├── config/           # Configuración (env, db)
│   │       ├── middleware/       # Middlewares (auth, etc)
│   │       ├── routes/           # Definición de rutas
│   │       └── services/         # Lógica de negocio
│   │
│   └── web/                       # Frontend React + Vite
│       └── src/
│           ├── main.tsx          # Punto de entrada
│           ├── App.tsx           # Componente raíz
│           ├── components/       # Componentes React
│           ├── hooks/            # Custom hooks
│           ├── stores/           # Zustand stores (estado global)
│           ├── utils/            # Funciones utilitarias
│           └── pages/            # Páginas (rutas)
│
├── .eslintrc.cjs                 # Configuración ESLint
├── .prettierrc                   # Configuración Prettier
├── tsconfig.base.json            # TypeScript base (extendida por otros)
├── pnpm-workspace.yaml           # Configuración del monorepo
└── package.json                  # Root - scripts y devDeps globales
```

## Workflows Comunes

### Crear un nuevo Endpoint API

1. **Define el schema en shared:**
   ```typescript
   // packages/shared/src/schemas/myEntity.schema.ts
   import { z } from 'zod';

   export const MyEntitySchema = z.object({
     id: z.string(),
     name: z.string(),
     // ... más campos
   });

   export type MyEntity = z.infer<typeof MyEntitySchema>;
   ```

2. **Exporta desde shared/src/index.ts:**
   ```typescript
   export { MyEntitySchema, type MyEntity } from './schemas/myEntity.schema';
   ```

3. **Crea la ruta en el API:**
   ```typescript
   // packages/api/src/routes/myEntity.routes.ts
   import { FastifyInstance } from 'fastify';
   import { MyEntitySchema, type MyEntity } from '@finanzas/shared';

   export const registerMyEntityRoutes = async (fastify: FastifyInstance) => {
     fastify.get<{ Reply: MyEntity[] }>('/my-entities', async () => {
       // Lógica aquí
       return [];
     });
   };
   ```

4. **Registra la ruta en server.ts:**
   ```typescript
   import { registerMyEntityRoutes } from './routes/myEntity.routes.js';

   // En la función start():
   await registerMyEntityRoutes(fastify);
   ```

### Crear un Componente React Tipado

```typescript
// packages/web/src/components/MyComponent.tsx
import type { MyEntity } from '@finanzas/shared';
import { useQuery } from '@tanstack/react-query';

interface MyComponentProps {
  entity: MyEntity;
  onSelect?: (id: string) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ entity, onSelect }) => {
  return (
    <div onClick={() => onSelect?.(entity.id)}>
      <h3>{entity.name}</h3>
    </div>
  );
};
```

### Usar TypeScript Estricto

El proyecto no permite `any`. Ejemplos:

```typescript
// ❌ NO PERMITIDO
const value: any = getData();

// ✅ CORRECTO
const value: unknown = getData();
if (typeof value === 'string') {
  // value es string aquí
}

// ✅ O mejor aún
const value = getData<MyType>(); // Si conoces el tipo
```

## Comandos pnpm

```bash
# Scripts del root
pnpm dev              # Ejecutar API + Web en paralelo
pnpm build            # Compilar todos los packages
pnpm lint             # Lint con ESLint
pnpm lint:fix         # Lint y fix automático
pnpm typecheck        # Type checking completo
pnpm test             # Ejecutar tests

# Ejecutar scripts en un package específico
pnpm --filter @finanzas/shared build
pnpm --filter @finanzas/api dev
pnpm --filter @finanzas/web build

# Instalar paquete en un workspace específico
pnpm add lodash --filter @finanzas/web

# Instalar devDependency en el root
pnpm add -D @types/node -w

# Ver estructura del workspace
pnpm list --depth=0
```

## Debugging

### API Debugging
```bash
# El servidor Fastify log todo con pino
# Los logs aparecerán en la terminal donde corriste: pnpm --filter @finanzas/api dev
```

### React DevTools
```bash
# Instala la extensión Chrome: React Developer Tools
# La app usa Zustand y React Query, también hay extensiones para estos
```

### TypeScript
```bash
# Verificar tipos sin compilar
pnpm typecheck

# Algunos IDEs como VS Code muestran errores de TS en tiempo real
```

## Git Hooks

Los pre-commit hooks ejecutan automáticamente:
1. ESLint --fix
2. Prettier --write
3. TypeScript --noEmit

Si un commit falla por estos motivos:
1. Los archivos se han modificado automáticamente (ESLint/Prettier)
2. Re-stagea los cambios: `git add .`
3. Intenta hacer commit nuevamente

## Variables de Entorno (packages/api/.env)

Crear el archivo `.env` basado en `.env.example`:

```env
# Servidor
PORT=3001
NODE_ENV=development

# Base de datos
MONGO_URI=mongodb://localhost:27017/finanzas

# Cache
REDIS_URL=redis://localhost:6379

# Seguridad (cambiar en producción!)
JWT_SECRET=tu-secreto-jwt-muy-largo-y-seguro-minimo-32-caracteres
JWT_REFRESH_SECRET=tu-secreto-refresh-muy-largo-y-seguro-minimo-32-caracteres
ENCRYPTION_KEY=tu-clave-hex-de-64-caracteres-minimo-para-32-bytes

# APIs externas (opcionales)
BINANCE_API_KEY=
CMC_API_KEY=
FINNHUB_API_KEY=
```

## Testing

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar tests con watch mode
pnpm test --watch

# Ejecutar tests de un archivo específico
pnpm test TransactionCard

# Generar coverage report
pnpm test --coverage
```

## Buenas Prácticas

1. **Tipos explícitos en funciones públicas:**
   ```typescript
   // ✅ Correcto
   export const getValue = (key: string): string | null => { ... }

   // ❌ Malo
   export const getValue = (key: string) => { ... }
   ```

2. **Usar `type` para imports de tipos:**
   ```typescript
   import type { User } from '@finanzas/shared';
   import { UserSchema } from '@finanzas/shared';
   ```

3. **Validación con Zod en APIs:**
   ```typescript
   const result = MySchema.safeParse(data);
   if (!result.success) {
     return reply.code(400).send({ error: result.error });
   }
   ```

4. **Componentes con TypeScript estricto:**
   ```typescript
   interface Props {
     value: string;
     onChange: (value: string) => void;
   }

   export const Component: React.FC<Props> = ({ value, onChange }) => {
     // ...
   };
   ```

## Troubleshooting

### "Module not found" error
```bash
# Asegúrate de que el package esté listado en pnpm-workspace.yaml
# y que hayas instalado las dependencias
pnpm install
```

### ESLint/Prettier no funciona
```bash
# Reinstala devDependencies
pnpm install

# Verifica la configuración
cat .eslintrc.cjs
cat .prettierrc
```

### TypeScript errors
```bash
# Ejecuta typecheck
pnpm typecheck

# Verifica que tsconfig.json extiende tsconfig.base.json
```

### Conflictos de dependencias
```bash
# pnpm usa un enfoque estricto de dependencias
# Verifica package.json de cada package
# Instala lo que falta explícitamente
```

## Performance Tips

1. **Build rápido:** pnpm es más rápido que npm/yarn
2. **Caché de TypeScript:** Los tipos se cachean automáticamente
3. **Vite para web:** Hot reload instantáneo
4. **Monorepo:** Comparte tipos sin compilación

## Recursos

- [pnpm Workspace](https://pnpm.io/workspaces)
- [Fastify Docs](https://www.fastify.io/)
- [React Documentation](https://react.dev)
- [Zod Documentation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
