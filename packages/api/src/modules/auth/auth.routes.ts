import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from './auth.controller.js';

export async function registerAuthRoutes(fastify: FastifyInstance): Promise<void> {
  // Scoped sub-router with a stricter rate limit: 10 requests per 15 minutes
  await fastify.register(async (authScope: FastifyInstance) => {
    await authScope.register(rateLimit, {
      max: 10,
      timeWindow: '15 minutes',
      skip(request) {
        return request.method === 'OPTIONS';
      },
      keyGenerator(request) {
        return request.ip;
      },
      errorResponseBuilder(_request, context) {
        return {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please retry after ${String(context.after)}.`,
          },
        };
      },
    });

    authScope.post('/auth/register', registerHandler);
    authScope.post('/auth/login', loginHandler);
    authScope.post('/auth/refresh', refreshHandler);
    authScope.post('/auth/logout', logoutHandler);
    authScope.post('/auth/forgot-password', forgotPasswordHandler);
    authScope.post('/auth/reset-password', resetPasswordHandler);
    authScope.post('/auth/verify-email', verifyEmailHandler);
  });
}
