import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { requireAuth } from '../../middlewares/authenticate.js';
import { findById, updateUser, updatePasswordHash } from './user.repository.js';
import { AuditLogModel } from '../audit/auditLog.model.js';
import type { SafeUser } from '../auth/auth.service.js';
import type { IUser } from './user.model.js';

const BCRYPT_COST = 12;

// ---- Schemas ---------------------------------------------------------------

const UpdateProfileBodySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  baseCurrency: z.string().length(3, 'Currency code must be exactly 3 characters').toUpperCase().optional(),
  preferences: z
    .object({
      locale: z.string().optional(),
      theme: z.enum(['light', 'dark']).optional(),
      dashboardWidgets: z.array(z.string()).optional(),
    })
    .optional(),
});

const ChangePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ---- Helpers ---------------------------------------------------------------

function toSafeUser(user: IUser): SafeUser {
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name,
    baseCurrency: user.baseCurrency,
    role: user.role,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    preferences: {
      locale: user.preferences?.locale ?? undefined,
      theme: user.preferences?.theme ?? undefined,
      dashboardWidgets: user.preferences?.dashboardWidgets ?? undefined,
    } as any,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt ?? undefined,
  } as any;
}

// ---- Handlers --------------------------------------------------------------

async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = await findById(request.user.userId);

  if (user === null) {
    return reply.status(404).send({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });
  }

  return reply.status(200).send({ data: { user: toSafeUser(user) } });
}

async function updateMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = UpdateProfileBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    });
  }

  if (Object.keys(parsed.data).length === 0) {
    return reply.status(400).send({
      error: { code: 'EMPTY_UPDATE', message: 'No fields provided for update' },
    });
  }

  const updateData = { ...parsed.data };
  if (parsed.data.firstName !== undefined || parsed.data.lastName !== undefined) {
    const user = await findById(request.user.userId);
    const existingName = user?.name ?? '';
    const [first, ...rest] = existingName.split(' ');
    const last = rest.join(' ');

    const firstName = parsed.data.firstName ?? first ?? '';
    const lastName = parsed.data.lastName ?? last ?? '';
    updateData.name = `${firstName} ${lastName}`.trim();

    delete (updateData as any).firstName;
    delete (updateData as any).lastName;
  }

  const updatedUser = await updateUser(request.user.userId, updateData as any);

  if (updatedUser === null) {
    return reply.status(404).send({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });
  }

  return reply.status(200).send({ data: { user: toSafeUser(updatedUser) } });
}

async function changePasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ChangePasswordBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    });
  }

  const user = await findById(request.user.userId);
  if (user === null) {
    return reply.status(404).send({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });
  }

  const currentPasswordValid = await user.comparePassword(parsed.data.currentPassword);
  if (!currentPasswordValid) {
    return reply.status(401).send({
      error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
    });
  }

  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
  await updatePasswordHash(request.user.userId, newPasswordHash);

  // Audit log entry
  await AuditLogModel.create({
    userId: user._id,
    action: 'user.password_change',
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    metadata: { changedAt: new Date().toISOString() },
  });

  return reply.status(200).send({
    data: { message: 'Password changed successfully. Please log in again with your new password.' },
  });
}

// ---- Route registration ----------------------------------------------------

export async function registerUsersRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(async (usersScope: FastifyInstance) => {
    // All routes in this scope require authentication
    usersScope.addHook('preHandler', requireAuth);

    usersScope.get('/users/me', getMeHandler);
    usersScope.patch('/users/me', updateMeHandler);
    usersScope.patch('/users/me/password', changePasswordHandler);
  });
}
