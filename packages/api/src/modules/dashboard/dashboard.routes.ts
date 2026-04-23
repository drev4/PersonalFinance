import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getNetWorth,
  getNetWorthHistory,
  getCashflow,
  getSpendingByCategory,
  getUpcomingRecurring,
  takeNetWorthSnapshot,
  type NetWorthPeriod,
} from './dashboard.service.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const PeriodSchema = z.enum(['1m', '3m', '6m', '1y', 'all']).default('1y');

const HistoryQuerySchema = z.object({
  period: PeriodSchema,
});

const CashflowQuerySchema = z.object({
  months: z.coerce
    .number()
    .int()
    .min(1)
    .max(24)
    .default(6),
});

const SpendingQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const UpcomingQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerDashboardRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /dashboard/net-worth
  fastify.get(
    '/dashboard/net-worth',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const data = await getNetWorth(userId);
      return reply.send({ data });
    },
  );

  // GET /dashboard/net-worth/history
  fastify.get(
    '/dashboard/net-worth/history',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { period } = HistoryQuerySchema.parse(request.query);
      const data = await getNetWorthHistory(userId, period as NetWorthPeriod);
      return reply.send({ data });
    },
  );

  // GET /dashboard/cashflow
  fastify.get(
    '/dashboard/cashflow',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { months } = CashflowQuerySchema.parse(request.query);
      const data = await getCashflow(userId, months);
      return reply.send({ data });
    },
  );

  // GET /dashboard/spending-by-category
  fastify.get(
    '/dashboard/spending-by-category',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { from: fromRaw, to: toRaw } = SpendingQuerySchema.parse(request.query);

      // Default to current calendar month (UTC)
      const now = new Date();
      const from = fromRaw ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const to = toRaw ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

      const data = await getSpendingByCategory(userId, from, to);
      return reply.send({ data });
    },
  );

  // GET /dashboard/upcoming-recurring
  fastify.get(
    '/dashboard/upcoming-recurring',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { days } = UpcomingQuerySchema.parse(request.query);
      const data = await getUpcomingRecurring(userId, days);
      return reply.send({ data });
    },
  );

  // POST /dashboard/snapshot  — force snapshot for the authenticated user
  fastify.post(
    '/dashboard/snapshot',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      await takeNetWorthSnapshot(userId);
      return reply.send({ data: { ok: true } });
    },
  );
}
