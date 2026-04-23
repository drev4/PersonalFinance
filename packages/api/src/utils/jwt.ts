import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: {
  userId: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '15m',
    issuer: 'finanzas-api',
    audience: 'finanzas-app',
  });
}

export function signRefreshToken(payload: { userId: string; tokenId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'finanzas-api',
    audience: 'finanzas-app',
  });
}

export function verifyAccessToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: 'finanzas-api',
    audience: 'finanzas-app',
  });

  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as JWTPayload;
  if (!payload.userId || !payload.email || !payload.role) {
    throw new Error('Invalid token payload: missing required fields');
  }

  return payload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'finanzas-api',
    audience: 'finanzas-app',
  });

  if (typeof decoded === 'string') {
    throw new Error('Invalid refresh token payload');
  }

  const payload = decoded as RefreshPayload;
  if (!payload.userId || !payload.tokenId) {
    throw new Error('Invalid refresh token payload: missing required fields');
  }

  return payload;
}
