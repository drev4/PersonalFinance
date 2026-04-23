import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().url('Invalid MongoDB URI'),
  REDIS_URL: z.string().url('Invalid Redis URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(64, 'ENCRYPTION_KEY must be at least 64 characters (32 bytes hex)'),
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

let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Using console here is acceptable — the logger depends on a valid env
    // and we are exiting immediately afterwards.
    console.error('Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Production hardening: enforce stronger secret lengths than dev/test.
// We parse with the base schema (32/64 chars minimum) so local and CI builds
// still work, but production boots MUST ship with long, high-entropy secrets.
// ---------------------------------------------------------------------------

if (env.NODE_ENV === 'production') {
  const errors: string[] = [];

  if (env.JWT_SECRET.length < 64) {
    errors.push('JWT_SECRET must be at least 64 chars in production');
  }
  if (env.JWT_REFRESH_SECRET.length < 64) {
    errors.push('JWT_REFRESH_SECRET must be at least 64 chars in production');
  }
  // ENCRYPTION_KEY is a hex-encoded 32-byte key — 64 hex chars is the minimum.
  if (env.ENCRYPTION_KEY.length < 64) {
    errors.push('ENCRYPTION_KEY must be at least 64 chars (32 bytes hex) in production');
  }
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different in production');
  }
  if (env.FRONTEND_URL === undefined || env.FRONTEND_URL === '') {
    errors.push('FRONTEND_URL must be set in production (used for CORS whitelist)');
  }

  if (errors.length > 0) {
    console.error('Production environment validation failed:');
    for (const msg of errors) console.error(`  - ${msg}`);
    process.exit(1);
  }
}

export default env;
