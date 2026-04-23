import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type JWTPayload } from '../utils/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization'];

  if (authHeader === undefined || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token is required',
      },
    });
  }

  const token = authHeader.slice(7);

  if (token === '') {
    return reply.status(401).send({
      error: { code: 'MISSING_TOKEN', message: 'Bearer token is empty' },
    });
  }

  let payload: JWTPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return reply.status(401).send({
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or has expired' },
    });
  }

  request.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}
