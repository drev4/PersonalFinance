import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required').url('Invalid MongoDB URI').optional().or(z.string().min(1)),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required').url('Invalid Redis URL').optional().or(z.string().min(1)),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional().or(z.string().min(1)),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional().or(z.string().min(1)),
  ENCRYPTION_KEY: z.string().min(64, 'ENCRYPTION_KEY must be at least 64 characters (32 bytes hex)').optional().or(z.string().min(1)),
  // Optional in development (CORS whitelist falls back to localhost dev servers).
  // Required in production — enforced in the post-parse guard below.
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL must be a valid URL')
    .optional(),
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),
  CMC_API_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENVIRONMENT: z.enum(['sandbox', 'development', 'production']).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

// Lazy load and validate env on first access
let env: Env | null = null;

function loadEnv(): Env {
  if (env) return env;

  try {
    env = EnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Using console here is acceptable — the logger depends on a valid env
      // and we are exiting immediately afterwards.
      console.error('Invalid environment variables:');
      error.issues.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }

  return env;
}

// ---------------------------------------------------------------------------
// Production hardening: enforce stronger secret lengths than dev/test.
// We parse with the base schema (32/64 chars minimum) so local and CI builds
// still work, but production boots MUST ship with long, high-entropy secrets.
// ---------------------------------------------------------------------------

function validateProduction(parsedEnv: Env): void {
  if (parsedEnv.NODE_ENV === 'production') {
    const errors: string[] = [];

    if (parsedEnv.JWT_SECRET.length < 64) {
      errors.push('JWT_SECRET must be at least 64 chars in production');
    }
    if (parsedEnv.JWT_REFRESH_SECRET.length < 64) {
      errors.push('JWT_REFRESH_SECRET must be at least 64 chars in production');
    }
    // ENCRYPTION_KEY is a hex-encoded 32-byte key — 64 hex chars is the minimum.
    if (parsedEnv.ENCRYPTION_KEY.length < 64) {
      errors.push('ENCRYPTION_KEY must be at least 64 chars (32 bytes hex) in production');
    }
    if (parsedEnv.JWT_SECRET === parsedEnv.JWT_REFRESH_SECRET) {
      errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different in production');
    }
    if (parsedEnv.FRONTEND_URL === undefined || parsedEnv.FRONTEND_URL === '') {
      errors.push('FRONTEND_URL must be set in production (used for CORS whitelist)');
    }

    if (errors.length > 0) {
      console.error('Production environment validation failed:');
      for (const msg of errors) console.error(`  - ${msg}`);
      process.exit(1);
    }
  }
}

// Export a proxy that lazy-loads and validates env on first access
export default new Proxy({} as Env, {
  get(target, prop) {
    const loaded = loadEnv();
    validateProduction(loaded);
    return (loaded as any)[prop];
  },
});
