import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getUserAccounts,
  createAccount,
  updateAccount,
  adjustBalance,
  archiveAccount,
  AccountError,
} from './account.service.js';
import { getNetWorth } from '../dashboard/dashboard.service.js';

const AccountTypeEnum = z.enum([
  'checking',
  'savings',
  'cash',
  'credit_card',
  'real_estate',
  'vehicle',
  'loan',
  'mortgage',
  'crypto',
  'investment',
  'other',
]);

const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: AccountTypeEnum,
  currency: z.string().length(3, 'Currency must be a 3-letter code').toUpperCase(),
  initialBalance: z.number().int('Balance must be an integer (cents)'),
  institution: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code')
    .optional(),
  icon: z.string().optional(),
  includedInNetWorth: z.boolean().optional(),
});

const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: AccountTypeEnum.optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  institution: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().optional(),
  includedInNetWorth: z.boolean().optional(),
});

const AdjustBalanceSchema = z.object({
  newBalance: z.number().int('Balance must be an integer (cents)'),
  note: z.string().max(200).optional(),
});

function handleAccountError(
  error: unknown,
  reply: FastifyReply,
): void | FastifyReply {
  if (error instanceof AccountError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

export async function registerAccountRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /accounts/net-worth  — must be before /:id to avoid param capture
  fastify.get(
    '/accounts/net-worth',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const summary = await getNetWorth(userId);
      return reply.send({ data: summary });
    },
  );

  // GET /accounts
  fastify.get(
    '/accounts',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const accounts = await getUserAccounts(userId);
      return reply.send({ data: accounts });
    },
  );

  // POST /accounts
  fastify.post(
    '/accounts',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateAccountSchema.parse(request.body);

      const account = await createAccount(userId, {
        userId,
        name: body.name,
        type: body.type,
        currency: body.currency,
        initialBalance: body.initialBalance,
        institution: body.institution ?? undefined,
        notes: body.notes ?? undefined,
        color: body.color ?? undefined,
        icon: body.icon ?? undefined,
        includedInNetWorth: body.includedInNetWorth ?? undefined,
      } as any);


      return reply.status(201).send({ data: account });
    },
  );

  // GET /accounts/:id
  fastify.get(
    '/accounts/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      const { getAccountById } = await import('./account.service.js');
      const account = await getAccountById(userId, id);

      if (account === null) {
        return reply.status(404).send({
          error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' },
        });
      }

      return reply.send({ data: account });
    },
  );

  // PATCH /accounts/:id
  fastify.patch(
    '/accounts/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateAccountSchema.parse(request.body);

      try {
        const account = await updateAccount(userId, id, body as any);
        return reply.send({ data: account });
      } catch (err) {
        return handleAccountError(err, reply);
      }
    },
  );

  // PATCH /accounts/:id/balance
  fastify.patch(
    '/accounts/:id([0-9a-fA-F]{24})/balance',

    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = AdjustBalanceSchema.parse(request.body);

      try {
        const result = await adjustBalance(userId, id, body.newBalance, body.note);
        return reply.send({ data: result });
      } catch (err) {
        return handleAccountError(err, reply);
      }
    },
  );

  // DELETE /accounts/:id  (archive)
  fastify.delete(
    '/accounts/:id([0-9a-fA-F]{24})',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        await archiveAccount(userId, id);
        return reply.status(204).send();
      } catch (err) {
        return handleAccountError(err, reply);
      }
    },
  );
}
