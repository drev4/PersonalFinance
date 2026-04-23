import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getUserGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoal,
  calculateMonthlySuggestion,
  GoalError,
} from './goal.service.js';

// ---- Zod schemas -------------------------------------------------------------

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

const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z
    .number()
    .int('Amount must be an integer (cents)')
    .positive('Target amount must be positive'),
  currentAmount: z
    .number()
    .int('Amount must be an integer (cents)')
    .nonnegative()
    .optional()
    .default(0),
  deadline: flexDate.optional(),
  linkedAccountId: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code')
    .optional(),
  icon: z.string().optional(),
});

const UpdateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z
    .number()
    .int('Amount must be an integer (cents)')
    .positive()
    .optional(),
  currentAmount: z
    .number()
    .int('Amount must be an integer (cents)')
    .nonnegative()
    .optional(),
  deadline: flexDate.optional(),
  linkedAccountId: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().optional(),
});

// ---- Error handler -----------------------------------------------------------

function handleGoalError(
  error: unknown,
  reply: Parameters<Parameters<FastifyInstance['get']>[2]>[1],
): ReturnType<Parameters<FastifyInstance['get']>[2]> {
  if (error instanceof GoalError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

// ---- Route registration ------------------------------------------------------

export async function registerGoalRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /goals
  fastify.get(
    '/goals',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const goals = await getUserGoals(userId);
      return reply.send({ data: goals });
    },
  );

  // POST /goals
  fastify.post(
    '/goals',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateGoalSchema.parse(request.body);

      const goal = await createGoal(userId, { ...body, userId });
      const monthlySuggestion = calculateMonthlySuggestion(goal);

      return reply.status(201).send({
        data: goal,
        meta: { monthlySuggestion },
      });
    },
  );

  // GET /goals/:id
  fastify.get(
    '/goals/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        const goal = await getGoal(userId, id);
        const monthlySuggestion = calculateMonthlySuggestion(goal);
        return reply.send({ data: goal, meta: { monthlySuggestion } });
      } catch (err) {
        return handleGoalError(err, reply);
      }
    },
  );

  // PATCH /goals/:id
  fastify.patch(
    '/goals/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateGoalSchema.parse(request.body);

      try {
        const goal = await updateGoal(userId, id, body);
        const monthlySuggestion = calculateMonthlySuggestion(goal);
        return reply.send({ data: goal, meta: { monthlySuggestion } });
      } catch (err) {
        return handleGoalError(err, reply);
      }
    },
  );

  // DELETE /goals/:id
  fastify.delete(
    '/goals/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        await deleteGoal(userId, id);
        return reply.status(204).send();
      } catch (err) {
        return handleGoalError(err, reply);
      }
    },
  );
}
