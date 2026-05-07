import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  createAlert,
  findByUser,
  findByHolding,
  findById,
  deleteAlert,
  toggleAlert,
} from './priceAlert.repository.js';
import { findById as findHolding } from './holding.repository.js';

const CreateAlertSchema = z.object({
  holdingId: z.string().min(1),
  condition: z.enum(['above', 'below']),
  targetPrice: z.number().int().positive(),
});

export async function registerPriceAlertRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /price-alerts — all alerts for the authenticated user
  fastify.get('/price-alerts', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { holdingId } = request.query as { holdingId?: string };

    const alerts = holdingId ? await findByHolding(userId, holdingId) : await findByUser(userId);

    return reply.send({ data: alerts });
  });

  // POST /price-alerts
  fastify.post('/price-alerts', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const body = CreateAlertSchema.parse(request.body);

    const holding = await findHolding(body.holdingId, userId);
    if (!holding) {
      return reply
        .status(404)
        .send({ error: { code: 'HOLDING_NOT_FOUND', message: 'Holding not found' } });
    }

    const alert = await createAlert({
      userId,
      holdingId: body.holdingId,
      symbol: holding.symbol,
      assetType: holding.assetType,
      condition: body.condition,
      targetPrice: body.targetPrice,
      currency: holding.currency,
    });

    return reply.status(201).send({ data: alert });
  });

  // DELETE /price-alerts/:id
  fastify.delete('/price-alerts/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };

    const deleted = await deleteAlert(id, userId);
    if (!deleted) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Alert not found' } });
    }

    return reply.status(204).send();
  });

  // PATCH /price-alerts/:id/toggle — flip isActive
  fastify.patch('/price-alerts/:id/toggle', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };

    const alert = await toggleAlert(id, userId);
    if (!alert) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Alert not found' } });
    }

    return reply.send({ data: alert });
  });
}
