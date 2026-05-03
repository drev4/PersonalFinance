import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  findRecurring,
  removeRecurring,
  updateRecurring,
  createRecurringTemplate,
} from './transaction.repository.js';
import { applyCategoryRule } from './transaction.service.js';
import { findById as findAccountById } from '../accounts/account.repository.js';

// ---- Zod schemas -------------------------------------------------------------

const RecurringFrequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

const flexDate = z.string().transform((s, ctx) => {
  const normalised = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(normalised);
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: 'custom', message: 'Invalid date format' });
    return z.NEVER;
  }
  return d;
});

const CreateRecurringSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number().int('Amount must be an integer (cents)').positive(),
  currency: z.string().length(3).toUpperCase(),
  description: z.string().min(1).max(500),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  frequency: RecurringFrequencyEnum,
  interval: z.number().int().positive().default(1),
  nextDate: flexDate,
  endDate: flexDate.optional(),
});

const UpdateRecurringSchema = z.object({
  frequency: RecurringFrequencyEnum.optional(),
  interval: z.number().int().positive().optional(),
  nextDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
  endDate: z
    .string()
    .datetime()
    .transform((s) => new Date(s))
    .optional(),
});

// ---- Route registration ------------------------------------------------------

export async function registerRecurringRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // POST /transactions/recurring
  fastify.post(
    '/transactions/recurring',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateRecurringSchema.parse(request.body);

      const account = await findAccountById(body.accountId, userId);
      if (account === null || !account.isActive) {
        return reply.status(404).send({
          error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' },
        });
      }

      let categoryId = body.categoryId;
      if (categoryId === undefined) {
        const auto = await applyCategoryRule(body.description, userId);
        if (auto !== null) categoryId = auto;
      }

      const template = await createRecurringTemplate({
        userId,
        accountId: body.accountId,
        type: body.type,
        amount: body.amount,
        currency: body.currency,
        description: body.description,
        categoryId,
        tags: body.tags,
        frequency: body.frequency,
        interval: body.interval,
        nextDate: body.nextDate,
        endDate: body.endDate,
      });

      return reply.status(201).send({ data: template });
    },
  );

  // GET /transactions/recurring
  fastify.get(
    '/transactions/recurring',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const templates = await findRecurring(userId);
      return reply.send({ data: templates });
    },
  );

  // PATCH /transactions/recurring/:id
  fastify.patch(
    '/transactions/recurring/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateRecurringSchema.parse(request.body);

      const updated = await updateRecurring(id, userId, body);
      if (updated === null) {
        return reply.status(404).send({
          error: {
            code: 'RECURRING_NOT_FOUND',
            message:
              'Recurring transaction not found or does not have a recurring configuration',
          },
        });
      }

      return reply.send({ data: updated });
    },
  );

  // DELETE /transactions/recurring/:id
  fastify.delete(
    '/transactions/recurring/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      const success = await removeRecurring(id, userId);
      if (!success) {
        return reply.status(404).send({
          error: {
            code: 'RECURRING_NOT_FOUND',
            message:
              'Recurring transaction not found or does not have a recurring configuration',
          },
        });
      }

      return reply.status(204).send();
    },
  );
}
