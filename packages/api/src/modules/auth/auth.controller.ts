import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  AuthError,
} from './auth.service.js';
import env from '../../config/env.js';

// ---- Validation schemas ----------------------------------------------------

const RegisterBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').trim(),
});

const LoginBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const ForgotPasswordBodySchema = z.object({
  email: z.string().email('Invalid email address'),
});

const ResetPasswordBodySchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const VerifyEmailBodySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ---- Cookie helpers --------------------------------------------------------

const COOKIE_NAME = 'refresh_token';

function setRefreshCookie(reply: FastifyReply, token: string): void {
  void reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth/refresh',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

function clearRefreshCookie(reply: FastifyReply): void {
  void reply.clearCookie(COOKIE_NAME, {
    path: '/auth/refresh',
  });
}

// ---- Error handling --------------------------------------------------------

function handleAuthError(
  err: unknown,
  reply: FastifyReply,
): FastifyReply {
  if (err instanceof AuthError) {
    return reply.status(err.statusCode).send({
      error: { code: err.code, message: err.message },
    });
  }

  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

// ---- Handlers --------------------------------------------------------------

export async function registerHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = RegisterBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const result = await register(parsed.data);
    setRefreshCookie(reply, result.refreshToken);
    return reply.status(201).send({
      data: { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) {
    return handleAuthError(err, reply);
  }
}

export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = LoginBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    const result = await login(parsed.data);
    setRefreshCookie(reply, result.refreshToken);
    return reply.status(200).send({
      data: { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) {
    return handleAuthError(err, reply);
  }
}

export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const token = request.cookies[COOKIE_NAME];
  if (token === undefined || token === '') {
    return reply.status(401).send({
      error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token is required' },
    });
  }

  try {
    const tokens = await refreshTokens(token);
    setRefreshCookie(reply, tokens.refreshToken);
    return reply.status(200).send({
      data: { accessToken: tokens.accessToken },
    });
  } catch (err) {
    return handleAuthError(err, reply);
  }
}

export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const token = request.cookies[COOKIE_NAME];

  if (token !== undefined && token !== '') {
    try {
      await logout(token);
    } catch {
      // Logout is best-effort; clear cookie regardless
    }
  }

  clearRefreshCookie(reply);
  return reply.status(200).send({ data: { message: 'Logged out successfully' } });
}

export async function forgotPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ForgotPasswordBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    await forgotPassword(parsed.data.email);
    // Always return success to prevent user enumeration
    return reply.status(200).send({
      data: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    });
  } catch (err) {
    return handleAuthError(err, reply);
  }
}

export async function resetPasswordHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = ResetPasswordBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.newPassword);
    clearRefreshCookie(reply);
    return reply.status(200).send({
      data: { message: 'Password has been reset successfully. Please log in again.' },
    });
  } catch (err) {
    return handleAuthError(err, reply);
  }
}

export async function verifyEmailHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const parsed = VerifyEmailBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: parsed.error.flatten(),
      },
    });
  }

  try {
    await verifyEmail(parsed.data.token);
    return reply.status(200).send({
      data: { message: 'Email verified successfully.' },
    });
  } catch (err) {
    return handleAuthError(err, reply);
  }
}
