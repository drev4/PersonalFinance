import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getUserBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetProgress,
  checkBudgetAlerts,
  BudgetError,
} from './budget.service.js';
import { findById } from './budget.repository.js';

// ---- Zod schemas -------------------------------------------------------------

const BudgetPeriodEnum = z.enum(['monthly', 'yearly']);

// Accepts both date-only (YYYY-MM-DD) and full ISO datetime strings
const flexDate = z.string().transform((s, ctx) => {
  const normalised = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(normalised);
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: 'custom', message: 'Invalid date format' });
    return z.NEVER;
  }
  return d;
});

const BudgetItemSchema = z.object({
  categoryId: z.string().min(1, 'categoryId is required'),
  amount: z
    .number()
    .int('Amount must be an integer (cents)')
    .positive('Amount must be positive'),
});

const CreateBudgetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  period: BudgetPeriodEnum,
  startDate: flexDate,
  items: z.array(BudgetItemSchema).min(1, 'At least one budget item is required'),
  rollover: z.boolean().optional().default(false),
});

const UpdateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  period: BudgetPeriodEnum.optional(),
  startDate: flexDate.optional(),
  items: z.array(BudgetItemSchema).optional(),
  rollover: z.boolean().optional(),
});

const ProgressQuerySchema = z.object({
  referenceDate: flexDate.optional(),
});

// ---- Error handler -----------------------------------------------------------

function handleBudgetError(
  error: unknown,
  reply: Parameters<Parameters<FastifyInstance['get']>[2]>[1],
): ReturnType<Parameters<FastifyInstance['get']>[2]> {
  if (error instanceof BudgetError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

// ---- Route registration ------------------------------------------------------

export async function registerBudgetRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /budgets/alerts — must be before /:id to avoid param capture
  fastify.get(
    '/budgets/alerts',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const alerts = await checkBudgetAlerts(userId);
      return reply.send({ data: alerts });
    },
  );

  // GET /budgets
  fastify.get(
    '/budgets',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const budgets = await getUserBudgets(userId);
      return reply.send({ data: budgets });
    },
  );

  // POST /budgets
  fastify.post(
    '/budgets',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateBudgetSchema.parse(request.body);

      try {
        const budget = await createBudget(userId, { ...body, userId });
        return reply.status(201).send({ data: budget });
      } catch (err) {
        return handleBudgetError(err, reply);
      }
    },
  );

  // GET /budgets/:id
  fastify.get(
    '/budgets/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      const budget = await findById(id, userId);
      if (budget === null) {
        return reply.status(404).send({
          error: { code: 'BUDGET_NOT_FOUND', message: 'Budget not found' },
        });
      }

      return reply.send({ data: budget });
    },
  );

  // PATCH /budgets/:id
  fastify.patch(
    '/budgets/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateBudgetSchema.parse(request.body);

      try {
        const budget = await updateBudget(userId, id, body);
        return reply.send({ data: budget });
      } catch (err) {
        return handleBudgetError(err, reply);
      }
    },
  );

  // DELETE /budgets/:id
  fastify.delete(
    '/budgets/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        await deleteBudget(userId, id);
        return reply.status(204).send();
      } catch (err) {
        return handleBudgetError(err, reply);
      }
    },
  );

  // GET /budgets/:id/progress
  fastify.get(
    '/budgets/:id/progress',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const query = ProgressQuerySchema.parse(request.query);

      try {
        const progress = await getBudgetProgress(
          userId,
          id,
          query.referenceDate ?? new Date(),
        );
        return reply.send({ data: progress });
      } catch (err) {
        return handleBudgetError(err, reply);
      }
    },
  );
}
