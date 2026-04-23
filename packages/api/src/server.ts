import Fastify, { type FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { ZodError } from 'zod';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import { createRedisClient, getRedisClient, closeRedisClient } from './config/redis.js';
import sanitizePlugin from './middlewares/sanitize.js';
import securityHeadersPlugin from './middlewares/securityHeaders.js';
import {
  apiRateLimit,
  rateLimitErrorBuilder,
  rateLimitAllowList,
} from './middlewares/rateLimiter.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerUsersRoutes } from './modules/users/users.routes.js';
import { registerCategoryRoutes } from './modules/categories/category.routes.js';
import { registerAccountRoutes } from './modules/accounts/account.routes.js';
import { registerTransactionRoutes } from './modules/transactions/transaction.routes.js';
import { registerCategoryRuleRoutes } from './modules/transactions/categoryRule.routes.js';
import { registerDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { registerBudgetRoutes } from './modules/budgets/budget.routes.js';
import { registerGoalRoutes } from './modules/goals/goal.routes.js';
import { registerRecurringRoutes } from './modules/transactions/recurring.routes.js';
import { registerHoldingsRoutes } from './modules/holdings/holding.routes.js';
import { registerIntegrationRoutes } from './modules/integrations/integration.routes.js';
import { registerSimulatorRoutes } from './modules/simulators/simulator.routes.js';
import { registerNotificationRoutes } from './modules/notifications/notification.routes.js';
import { registerReportRoutes } from './modules/reports/report.routes.js';
import { registerCurrencyRoutes } from './modules/currency/currency.routes.js';
import { scheduleAllJobs } from './jobs/index.js';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// ---- Plugins ---------------------------------------------------------------

// Strict security headers via Helmet.
// CSP is tuned for a first-party SPA served on the same origin; no third-party
// scripts/iframes are whitelisted. Adjust `connectSrc` if the frontend ever
// needs to reach external APIs directly from the browser (e.g. websockets).
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31_536_000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
});

// CORS: explicit whitelist per environment. Production only accepts the
// configured FRONTEND_URL; development permits the Vite/Next dev servers.
const ALLOWED_ORIGINS: readonly string[] =
  env.NODE_ENV === 'production'
    ? env.FRONTEND_URL !== undefined
      ? [env.FRONTEND_URL]
      : []
    : ['http://localhost:5173', 'http://localhost:3000'];

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow same-origin / server-to-server requests (no Origin header)
    if (origin === undefined || origin === '') {
      cb(null, true);
      return;
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Origin ${origin} is not allowed by CORS policy`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
});

// Sanitization: MUST run before any route handler so every body/query/param is
// cleaned of __proto__/constructor/prototype keys and truncated to a sane size
// before Zod validation fires.
await fastify.register(sanitizePlugin);

// Adds per-response security headers (X-Frame-Options, X-Content-Type-Options,
// Cache-Control for sensitive routes). Registered globally.
await fastify.register(securityHeadersPlugin);

// Global rate limit (auth routes will apply a stricter limit on top).
// Backed by Redis so the budget is shared across API replicas.
await fastify.register(rateLimit, {
  max: apiRateLimit.max,
  timeWindow: apiRateLimit.timeWindow,
  redis: getRedisClient(),
  allowList: rateLimitAllowList,
  errorResponseBuilder: rateLimitErrorBuilder,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true,
  },
});

await fastify.register(cookie);

// ---- Error handler ---------------------------------------------------------

fastify.setErrorHandler(
  (error: FastifyError | ZodError | Error, _request, reply) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues,
        },
      });
    }

    // Fastify-native errors (e.g. rate limit, 404, etc.)
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      const statusCode = error.statusCode;

      // Rate limit errors from @fastify/rate-limit already return formatted responses
      if (statusCode === 429) {
        return reply.status(429).send({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: error.message,
          },
        });
      }

      return reply.status(statusCode).send({
        error: {
          code: 'REQUEST_ERROR',
          message: error.message,
        },
      });
    }

    // Generic / unhandled errors
    fastify.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : (error.message ?? 'An unexpected error occurred'),
      },
    });
  },
);

// ---- Decorators ------------------------------------------------------------

// Decorate request with `user` so Fastify tracks it; overwritten by requireAuth
fastify.decorateRequest('user', null);

// ---- Routes ----------------------------------------------------------------

// Health check
fastify.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
fastify.get('/', async (_request, reply) => {
  return reply.send({
    message: 'Finanzas API',
    version: '0.1.0',
    status: 'running',
  });
});

// Auth routes: POST /auth/*
await fastify.register(registerAuthRoutes);

// Users routes: GET|PATCH /users/*
await fastify.register(registerUsersRoutes);

// Categories routes: /categories
await fastify.register(registerCategoryRoutes);

// Accounts routes: /accounts
await fastify.register(registerAccountRoutes);

// Transaction routes: /transactions
await fastify.register(registerTransactionRoutes);

// Category rule routes: /category-rules
await fastify.register(registerCategoryRuleRoutes);

// Dashboard routes: /dashboard
await fastify.register(registerDashboardRoutes);

// Budget routes: /budgets
await fastify.register(registerBudgetRoutes);

// Savings goal routes: /goals
await fastify.register(registerGoalRoutes);

// Recurring transaction management routes: /transactions/recurring
await fastify.register(registerRecurringRoutes);

// Holdings (investment positions) routes: /holdings
await fastify.register(registerHoldingsRoutes);

// Integrations routes: /integrations
await fastify.register(registerIntegrationRoutes);

// Simulator routes: /simulators (public) and /simulations (auth-required)
await fastify.register(registerSimulatorRoutes);

// Notification routes: /notifications
await fastify.register(registerNotificationRoutes);

// Report routes: /reports
await fastify.register(registerReportRoutes);

// Currency rates route: /currency/rates
await fastify.register(registerCurrencyRoutes);

// ---- Server startup --------------------------------------------------------

const start = async (): Promise<void> => {
  try {
    // Redis is initialized lazily by `getRedisClient()` during plugin
    // registration above. We keep the explicit call as a no-op safety net in
    // case registration ordering ever changes.
    createRedisClient();

    // Connect to MongoDB (also ensures indexes are built)
    await connectDB();

    // Start HTTP server
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    fastify.log.info(`Server running at http://localhost:${env.PORT}`);

    // Schedule background jobs (skip in test environment)
    if (env.NODE_ENV !== 'test') {
      scheduleAllJobs();
    }
  } catch (err) {
    fastify.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

// ---- Graceful shutdown -----------------------------------------------------

const shutdown = async (): Promise<void> => {
  fastify.log.info('Shutting down gracefully...');
  try {
    await fastify.close();
    await closeRedisClient();
    fastify.log.info('Server shut down cleanly');
  } catch (err) {
    fastify.log.error({ err }, 'Error during shutdown');
  }
  process.exit(0);
};

process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });

start();
