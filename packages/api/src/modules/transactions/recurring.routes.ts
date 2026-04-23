import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  findRecurring,
  removeRecurring,
  updateRecurring,
} from './transaction.repository.js';

// ---- Zod schemas -------------------------------------------------------------

const RecurringFrequencyEnum = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

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
