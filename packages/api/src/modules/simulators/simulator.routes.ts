import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  calculate,
  saveSimulation,
  getUserSimulations,
  getSimulation,
  deleteSimulation,
  generatePdf,
  SimulatorError,
} from './simulator.service.js';
import type { SimulationType } from './simulation.model.js';

// ---- Error handler ----------------------------------------------------------

function handleSimulatorError(
  error: unknown,
  reply: FastifyReply,
): void | FastifyReply {
  if (error instanceof SimulatorError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

// ---- Schema for saved simulations -------------------------------------------

const SaveSimulationBodySchema = z.object({
  type: z.enum(['mortgage', 'loan', 'investment', 'early_repayment', 'retirement']),
  name: z.string().min(1, 'Name is required').max(150),
  inputs: z.record(z.unknown()),
});

const SimulationTypeQuerySchema = z.object({
  type: z
    .enum(['mortgage', 'loan', 'investment', 'early_repayment', 'retirement'])
    .optional(),
});

// ---- Route registration -----------------------------------------------------

export async function registerSimulatorRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // --------------------------------------------------------------------------
  // Real-time calculators — no auth, rate limited per IP (20 req/min)
  // --------------------------------------------------------------------------

  const rateLimitConfig = {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  };

  // POST /simulators/mortgage
  fastify.post(
    '/simulators/mortgage',
    rateLimitConfig,
    async (request, reply) => {
      try {
        const result = calculate('mortgage', request.body);
        return reply.send({ data: result });
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // POST /simulators/loan
  fastify.post(
    '/simulators/loan',
    rateLimitConfig,
    async (request, reply) => {
      try {
        const result = calculate('loan', request.body);
        return reply.send({ data: result });
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // POST /simulators/investment
  fastify.post(
    '/simulators/investment',
    rateLimitConfig,
    async (request, reply) => {
      try {
        const result = calculate('investment', request.body);
        return reply.send({ data: result });
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // POST /simulators/early-repayment
  fastify.post(
    '/simulators/early-repayment',
    rateLimitConfig,
    async (request, reply) => {
      try {
        const result = calculate('early_repayment', request.body);
        return reply.send({ data: result });
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // POST /simulators/retirement
  fastify.post(
    '/simulators/retirement',
    rateLimitConfig,
    async (request, reply) => {
      try {
        const result = calculate('retirement', request.body);
        return reply.send({ data: result });
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Saved simulations — require auth
  // --------------------------------------------------------------------------

  // GET /simulations?type=mortgage
  // Alias for /simulators/saved used by frontend
  const listHandler = async (request: any, reply: any) => {
    const { userId } = request.user!;
    const { type } = SimulationTypeQuerySchema.parse(request.query);
    const simulations = await getUserSimulations(userId, type as SimulationType | undefined);
    return reply.send({ data: simulations });
  };

  fastify.get('/simulations', { preHandler: requireAuth }, listHandler);
  fastify.get('/simulators/saved', { preHandler: requireAuth }, listHandler);

  // POST /simulations
  fastify.post(
    '/simulations',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = SaveSimulationBodySchema.parse(request.body);

      try {
        const simulation = await saveSimulation(
          userId,
          body.type as SimulationType,
          body.name,
          body.inputs,
        );
        return reply.status(201).send({ data: simulation });
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // GET /simulations/:id
  fastify.get(
    '/simulations/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        const simulation = await getSimulation(userId, id);
        return reply.send({ data: simulation });
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // DELETE /simulations/:id
  fastify.delete(
    '/simulations/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        await deleteSimulation(userId, id);
        return reply.status(204).send();
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );

  // GET /simulations/:id/pdf
  fastify.get(
    '/simulations/:id([0-9a-fA-F]{24})/pdf',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        const pdfBuffer = await generatePdf(userId, id);
        return reply
          .status(200)
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="simulation-${id}.pdf"`)
          .header('Content-Length', pdfBuffer.length)
          .send(pdfBuffer);
      } catch (err) {
        return handleSimulatorError(err, reply);
      }
    },
  );
}
