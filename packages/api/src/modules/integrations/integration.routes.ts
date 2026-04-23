import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  connectBinance,
  getIntegrations,
  disconnectIntegration,
  triggerManualSync,
  IntegrationError,
} from './integration.service.js';
import { IntegrationCredentialsModel } from './integrationCredentials.model.js';
import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const ConnectBinanceSchema = z.object({
  apiKey: z.string().min(1, 'apiKey is required'),
  apiSecret: z.string().min(1, 'apiSecret is required'),
});

// ---------------------------------------------------------------------------
// Error handler helper
// ---------------------------------------------------------------------------

function handleIntegrationError(
  error: unknown,
  reply: Parameters<Parameters<FastifyInstance['get']>[2]>[1],
): ReturnType<Parameters<FastifyInstance['get']>[2]> {
  if (error instanceof IntegrationError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerIntegrationRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /integrations — list integration statuses for the authenticated user
  fastify.get(
    '/integrations',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const integrations = await getIntegrations(userId);
      return reply.send({ data: integrations });
    },
  );

  // POST /integrations/binance — connect a Binance account
  fastify.post(
    '/integrations/binance',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = ConnectBinanceSchema.parse(request.body);

      try {
        await connectBinance(userId, body.apiKey, body.apiSecret);
        return reply.status(201).send({
          data: { message: 'Binance integration connected. Initial sync has been scheduled.' },
        });
      } catch (err) {
        return handleIntegrationError(err, reply);
      }
    },
  );

  // POST /integrations/:provider/sync — enqueue a manual high-priority sync
  fastify.post(
    '/integrations/:provider/sync',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { provider } = request.params as { provider: string };

      try {
        const result = await triggerManualSync(userId, provider);
        return reply.status(202).send({
          data: { jobId: result.jobId, message: 'Sync job enqueued successfully.' },
        });
      } catch (err) {
        return handleIntegrationError(err, reply);
      }
    },
  );

  // DELETE /integrations/:provider — disconnect an integration
  fastify.delete(
    '/integrations/:provider',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { provider } = request.params as { provider: string };

      try {
        await disconnectIntegration(userId, provider);
        return reply.status(204).send();
      } catch (err) {
        return handleIntegrationError(err, reply);
      }
    },
  );

  // GET /integrations/:provider/status — detailed status for a single integration
  fastify.get(
    '/integrations/:provider/status',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { provider } = request.params as { provider: string };

      const credential = await IntegrationCredentialsModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        provider,
      })
        .select('provider isActive lastSyncAt lastSyncStatus lastSyncError updatedAt')
        .lean()
        .exec();

      if (credential === null) {
        return reply.status(404).send({
          error: {
            code: 'INTEGRATION_NOT_FOUND',
            message: `No ${provider} integration found for this account.`,
          },
        });
      }

      return reply.send({
        data: {
          provider: credential.provider,
          connected: credential.isActive,
          lastSyncAt: credential.lastSyncAt,
          lastSyncStatus: credential.lastSyncStatus,
          lastSyncError: credential.lastSyncError,
          updatedAt: credential.updatedAt,
        },
      });
    },
  );
}
