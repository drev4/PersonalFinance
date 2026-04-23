import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getUserHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
  searchTicker,
  importFromCsv,
  getPortfolioSummary,
  HoldingError,
} from './holding.service.js';
import { findById } from './holding.repository.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const AssetTypeEnum = z.enum(['crypto', 'stock', 'etf', 'bond']);
const HoldingSourceEnum = z.enum(['manual', 'binance', 'csv_import']);

const CreateHoldingSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  assetType: AssetTypeEnum,
  symbol: z.string().min(1, 'Symbol is required').max(20).toUpperCase(),
  exchange: z.string().max(20).optional(),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, 'quantity must be a positive decimal string'),
  averageBuyPrice: z.number().int('averageBuyPrice must be an integer (cents)').min(0),
  currency: z.string().length(3, 'currency must be a 3-letter code').toUpperCase(),
  currentPrice: z.number().int().min(0).optional(),
  source: HoldingSourceEnum.default('manual'),
  externalId: z.string().optional(),
});

const UpdateHoldingSchema = z.object({
  accountId: z.string().min(1).optional(),
  assetType: AssetTypeEnum.optional(),
  symbol: z.string().min(1).max(20).toUpperCase().optional(),
  exchange: z.string().max(20).optional(),
  quantity: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  averageBuyPrice: z.number().int().min(0).optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  currentPrice: z.number().int().min(0).optional(),
  source: HoldingSourceEnum.optional(),
  externalId: z.string().optional(),
});

const ImportCsvSchema = z.object({
  accountId: z.string().min(1, 'accountId is required'),
  csvContent: z.string().min(1, 'csvContent is required'),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'q (search query) is required'),
  type: z.enum(['crypto', 'stock']),
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

function handleHoldingError(
  error: unknown,
  reply: FastifyReply,
): void | FastifyReply {
  if (error instanceof HoldingError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerHoldingsRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /holdings/search
  // Alias for /holdings/search-ticker
  fastify.get(
    '/holdings/search',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = SearchQuerySchema.parse(request.query);
      const results = await searchTicker(query.q, query.type);
      return reply.send({ data: results });
    },
  );

  fastify.get(
    '/holdings/search-ticker',
    { preHandler: requireAuth },
    async (request, reply) => {
      const query = SearchQuerySchema.parse(request.query);
      const results = await searchTicker(query.q, query.type);
      return reply.send({ data: results });
    },
  );


  // GET /holdings/portfolio/summary
  // Alias for /holdings/portfolio-summary
  fastify.get(
    '/holdings/portfolio/summary',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const summary = await getPortfolioSummary(userId);
      return reply.send({ data: summary });
    },
  );

  fastify.get(
    '/holdings/portfolio-summary',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const summary = await getPortfolioSummary(userId);
      return reply.send({ data: summary });
    },
  );


  // POST /holdings/import-csv  — must be before /:id
  fastify.post(
    '/holdings/import-csv',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = ImportCsvSchema.parse(request.body);

      try {
        const result = await importFromCsv(userId, body.accountId, body.csvContent);
        return reply.status(201).send({ data: result });
      } catch (err) {
        return handleHoldingError(err, reply);
      }
    },
  );

  // GET /holdings
  fastify.get(
    '/holdings',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const holdings = await getUserHoldings(userId);
      return reply.send({ data: holdings });
    },
  );

  // POST /holdings
  fastify.post(
    '/holdings',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateHoldingSchema.parse(request.body);

      try {
        const holding = await createHolding(userId, {
          userId,
          accountId: body.accountId,
          assetType: body.assetType,
          symbol: body.symbol,
          exchange: body.exchange ?? '',
          quantity: body.quantity,
          averageBuyPrice: body.averageBuyPrice,
          currency: body.currency,
          source: body.source,
          ...(body.currentPrice !== undefined ? { currentPrice: body.currentPrice } : {}),
          ...(body.externalId !== undefined ? { externalId: body.externalId } : {}),
        });
        return reply.status(201).send({ data: holding });
      } catch (err) {
        return handleHoldingError(err, reply);
      }
    },
  );

  // GET /holdings/:id
  fastify.get(
    '/holdings/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      const holding = await findById(id, userId);
      if (holding === null) {
        return reply.status(404).send({
          error: { code: 'HOLDING_NOT_FOUND', message: 'Holding not found' },
        });
      }
      return reply.send({ data: holding });
    },
  );

  // PATCH /holdings/:id
  fastify.patch(
    '/holdings/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateHoldingSchema.parse(request.body);

      try {
        const updateData = { ...body };
        // Remove undefined fields to satisfy exactOptionalPropertyTypes if needed, 
        // though Zod .parse() usually handles this if configured.
        const holding = await updateHolding(userId, id, updateData as any);
        return reply.send({ data: holding });
      } catch (err) {
        return handleHoldingError(err, reply);
      }
    },
  );

  // DELETE /holdings/:id
  fastify.delete(
    '/holdings/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        await deleteHolding(userId, id);
        return reply.status(204).send();
      } catch (err) {
        return handleHoldingError(err, reply);
      }
    },
  );
}
