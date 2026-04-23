import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import { getRates } from '../../services/currency.service.js';

const QuerySchema = z.object({
  base: z.string().length(3).toUpperCase().default('EUR'),
});

export async function registerCurrencyRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/currency/rates',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = QuerySchema.parse(request.query);
      const rates = await getRates(query.base);
      return reply.send({ data: { base: query.base, rates } });
    },
  );
}
