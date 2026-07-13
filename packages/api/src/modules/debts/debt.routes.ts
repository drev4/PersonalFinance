import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getUserDebts,
  getDebt,
  createDebt,
  updateDebt,
  deleteDebt,
  makePayment,
  calculateDebtInfo,
  DebtError,
} from './debt.service.js';

// ---- Zod schemas -------------------------------------------------------------

const flexDate = z.string().transform((s, ctx) => {
  const normalised = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(normalised);
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: 'custom', message: 'Invalid date format' });
    return z.NEVER;
  }
  return d;
});

const DebtTypeEnum = z.enum([
  'credit_card',
  'personal_loan',
  'mortgage',
  'student_loan',
  'car_loan',
  'other',
]);

const CreateDebtSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: DebtTypeEnum,
  currency: z.string().length(3, 'Currency must be 3 characters').toUpperCase(),
  originalAmount: z.number().int().positive('Original amount must be positive'),
  currentBalance: z.number().int().nonnegative('Balance cannot be negative'),
  interestRate: z.number().min(0).max(100).default(0),
  minimumPayment: z.number().int().nonnegative().default(0),
  nextPaymentDate: flexDate.optional(),
  linkedAccountId: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code')
    .optional(),
  icon: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const UpdateDebtSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: DebtTypeEnum.optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  originalAmount: z.number().int().positive().optional(),
  currentBalance: z.number().int().nonnegative().optional(),
  interestRate: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().int().nonnegative().optional(),
  nextPaymentDate: flexDate.optional(),
  linkedAccountId: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const PaymentSchema = z.object({
  amount: z.number().int().positive('Payment amount must be positive'),
});

// ---- Error handler -----------------------------------------------------------

function handleDebtError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof DebtError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

// ---- Route registration ------------------------------------------------------

export async function registerDebtRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /debts
  fastify.get('/debts', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const debts = await getUserDebts(userId);
    const data = debts.map((d) => ({ ...d.toObject(), info: calculateDebtInfo(d) }));
    return reply.send({ data });
  });

  // POST /debts
  fastify.post('/debts', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const body = CreateDebtSchema.parse(request.body);
    const debt = await createDebt(userId, { ...body, userId });
    return reply.status(201).send({ data: { ...debt.toObject(), info: calculateDebtInfo(debt) } });
  });

  // GET /debts/:id
  fastify.get('/debts/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };
    try {
      const debt = await getDebt(userId, id);
      return reply.send({ data: { ...debt.toObject(), info: calculateDebtInfo(debt) } });
    } catch (err) {
      return handleDebtError(err, reply);
    }
  });

  // PATCH /debts/:id
  fastify.patch('/debts/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };
    const body = UpdateDebtSchema.parse(request.body);
    try {
      const debt = await updateDebt(userId, id, body);
      return reply.send({ data: { ...debt.toObject(), info: calculateDebtInfo(debt) } });
    } catch (err) {
      return handleDebtError(err, reply);
    }
  });

  // POST /debts/:id/payment
  fastify.post('/debts/:id/payment', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };
    const body = PaymentSchema.parse(request.body);
    try {
      const debt = await makePayment(userId, id, body.amount);
      return reply.send({ data: { ...debt.toObject(), info: calculateDebtInfo(debt) } });
    } catch (err) {
      return handleDebtError(err, reply);
    }
  });

  // DELETE /debts/:id
  fastify.delete('/debts/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };
    try {
      await deleteDebt(userId, id);
      return reply.status(204).send();
    } catch (err) {
      return handleDebtError(err, reply);
    }
  });
}
