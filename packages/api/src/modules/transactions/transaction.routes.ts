import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  createTransfer,
  updateTransaction,
  deleteTransaction,
  bulkCreate,
  getSpendingByCategory,
  getCashflow,
  TransactionError,
} from './transaction.service.js';

// ---- Zod schemas -------------------------------------------------------------

const TransactionTypeEnum = z.enum(['income', 'expense', 'transfer', 'adjustment']);
const TransactionSourceEnum = z.enum(['manual', 'binance', 'csv_import', 'adjustment']);

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

const CreateTransactionSchema = z.object({
  accountId: z.string().min(1),
  type: TransactionTypeEnum,
  amount: z.number().int('Amount must be an integer (cents)').positive(),
  currency: z.string().length(3).toUpperCase(),
  date: flexDate,
  description: z.string().min(1).max(500),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
  source: TransactionSourceEnum.optional(),
  externalId: z.string().optional(),
});

const UpdateTransactionSchema = z.object({
  amount: z.number().int('Amount must be an integer (cents)').positive().optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  date: flexDate.optional(),
  description: z.string().min(1).max(500).optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

const CreateTransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().int('Amount must be an integer (cents)').positive(),
  date: flexDate,
  description: z.string().min(1).max(500),
  currency: z.string().length(3).toUpperCase().optional(),
  tags: z.array(z.string()).optional(),
});

const BulkCreateSchema = z.object({
  transactions: z.array(CreateTransactionSchema).min(1),
});

const ListQuerySchema = z.object({
  from: flexDate.optional(),
  to: flexDate.optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  type: TransactionTypeEnum.optional(),
  search: z.string().optional(),
  tags: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  page: z
    .string()
    .transform((s) => parseInt(s, 10))
    .optional(),
  limit: z
    .string()
    .transform((s) => parseInt(s, 10))
    .optional(),
});

const SpendingQuerySchema = z.object({
  from: flexDate,
  to: flexDate,
});

const CashflowQuerySchema = z.object({
  months: z
    .string()
    .transform((s) => parseInt(s, 10))
    .refine((n) => n >= 1 && n <= 24, { message: 'months must be between 1 and 24' })
    .optional()
    .default(6),
});

// ---- Error handler -----------------------------------------------------------

function handleTxError(
  error: unknown,
  reply: FastifyReply,
): void | FastifyReply {
  if (error instanceof TransactionError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

// ---- Route registration ------------------------------------------------------

export async function registerTransactionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /transactions/stats/spending-by-category
  fastify.get(
    '/transactions/stats/spending-by-category',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const query = SpendingQuerySchema.parse(request.query);
      const data = await getSpendingByCategory(userId, query.from, query.to);
      return reply.send({ data });
    },
  );

  // GET /transactions/stats/cashflow
  fastify.get(
    '/transactions/stats/cashflow',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const query = CashflowQuerySchema.parse(request.query);
      const months = typeof query.months === 'string'
        ? parseInt(query.months, 10)
        : query.months;
      const data = await getCashflow(userId, months);
      return reply.send({ data });
    },
  );

  // GET /transactions
  fastify.get(
    '/transactions',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const filters = ListQuerySchema.parse(request.query);
      const result = await getTransactions(userId, filters as any);
      return reply.send({ data: result });
    },
  );

  // POST /transactions/transfer
  fastify.post(
    '/transactions/transfer',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateTransferSchema.parse(request.body);

      try {
        const result = await createTransfer(userId, body as any);
        return reply.status(201).send({ data: result });
      } catch (err) {
        return handleTxError(err, reply);
      }
    },
  );

  // POST /transactions/bulk
  fastify.post(
    '/transactions/bulk',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = BulkCreateSchema.parse(request.body);

      const result = await bulkCreate(
        userId,
        body.transactions.map((t) => ({ ...t, userId })) as any,
      );

      return reply.status(201).send({ data: result });
    },
  );

  // POST /transactions
  fastify.post(
    '/transactions',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateTransactionSchema.parse(request.body);

      try {
        const tx = await createTransaction(userId, { ...body, userId } as any);
        return reply.status(201).send({ data: tx });
      } catch (err) {
        return handleTxError(err, reply);
      }
    },
  );

  // GET /transactions/:id
  fastify.get(
    '/transactions/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        const tx = await getTransaction(userId, id);
        return reply.send({ data: tx });
      } catch (err) {
        return handleTxError(err, reply);
      }
    },
  );

  // PATCH /transactions/:id
  fastify.patch(
    '/transactions/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateTransactionSchema.parse(request.body);

      try {
        const tx = await updateTransaction(userId, id, body as any);

        return reply.send({ data: tx });
      } catch (err) {
        return handleTxError(err, reply);
      }
    },
  );

  // DELETE /transactions/:id
  fastify.delete(
    '/transactions/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        await deleteTransaction(userId, id);
        return reply.status(204).send();
      } catch (err) {
        return handleTxError(err, reply);
      }
    },
  );
}
