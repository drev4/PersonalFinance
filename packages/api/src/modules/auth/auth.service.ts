import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import type { IUser } from '../users/user.model.js';
import {
  findByEmail,
  findById,
  createUser,
  updatePasswordHash,
  markEmailVerified,
  updateLastLogin,
} from '../users/user.repository.js';
import { getRedisClient } from '../../config/redis.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { sendPasswordResetEmail, sendEmailVerification } from '../../utils/email.js';
import { seedDefaultCategories } from '../categories/category.repository.js';

const BCRYPT_COST = 12;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// ---- Types ----------------------------------------------------------------

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  baseCurrency: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: {
    locale: string;
    theme: 'light' | 'dark';
    dashboardWidgets: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

// ---- Helpers ---------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

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
      locale: user.preferences.locale,
      theme: user.preferences.theme,
      dashboardWidgets: user.preferences.dashboardWidgets,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshKey(userId: string, tokenId: string): string {
  return `refresh:${userId}:${tokenId}`;
}

function blacklistKey(userId: string, tokenId: string): string {
  return `blacklist:${userId}:${tokenId}`;
}

function resetKey(userId: string): string {
  return `reset:${userId}`;
}

function verifyEmailKey(userId: string): string {
  return `verify_email:${userId}`;
}

// ---- Service ---------------------------------------------------------------

export async function register(dto: RegisterDTO): Promise<AuthResult> {
  const existing = await findByEmail(dto.email);
  if (existing !== null) {
    throw new AuthError('EMAIL_ALREADY_EXISTS', 'An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

  const user = await createUser({
    email: dto.email,
    passwordHash,
    name: dto.name,
  });

  const userId = user._id.toHexString();
  const tokenId = uuidv4();

  const accessToken = signAccessToken({ userId, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId, tokenId });

  const redis = getRedisClient();
  await redis.setex(
    refreshKey(userId, tokenId),
    REFRESH_TTL_SECONDS,
    '1',
  );

  // Seed default categories for the new user (non-blocking)
  seedDefaultCategories(userId).catch((err: unknown) => {
    console.error('[Auth] Failed to seed default categories:', err);
  });

  // Send verification email (non-blocking — errors logged but not thrown)
  // Token format: "<userId>.<randomHex>" so we can look up by userId on verify
  const rawVerificationToken = randomBytes(32).toString('hex');
  const verificationHash = hashToken(rawVerificationToken);
  const verificationToken = `${userId}.${rawVerificationToken}`;
  await redis.setex(verifyEmailKey(userId), VERIFY_TOKEN_TTL_SECONDS, verificationHash);

  sendEmailVerification(user.email, verificationToken).catch((err: unknown) => {
    console.error('[Auth] Failed to send verification email:', err);
  });

  return { user: toSafeUser(user), accessToken, refreshToken };
}

export async function login(dto: LoginDTO): Promise<AuthResult> {
  const user = await findByEmail(dto.email);
  if (user === null) {
    // Constant-time response to prevent user enumeration
    await bcrypt.hash(dto.password, BCRYPT_COST);
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const passwordValid = await user.comparePassword(dto.password);
  if (!passwordValid) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const userId = user._id.toHexString();
  const tokenId = uuidv4();

  const accessToken = signAccessToken({ userId, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId, tokenId });

  const redis = getRedisClient();
  await redis.setex(
    refreshKey(userId, tokenId),
    REFRESH_TTL_SECONDS,
    '1',
  );

  // Update last login in the background
  updateLastLogin(userId).catch((err: unknown) => {
    console.error('[Auth] Failed to update lastLoginAt:', err);
  });

  return { user: toSafeUser(user), accessToken, refreshToken };
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { userId: string; tokenId: string };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
  }

  const { userId, tokenId } = payload;
  const redis = getRedisClient();

  // Check if token has been blacklisted
  const isBlacklisted = await redis.exists(blacklistKey(userId, tokenId));
  if (isBlacklisted === 1) {
    throw new AuthError('REFRESH_TOKEN_REVOKED', 'Refresh token has been revoked', 401);
  }

  // Verify the token is still in the whitelist
  const exists = await redis.exists(refreshKey(userId, tokenId));
  if (exists === 0) {
    throw new AuthError('REFRESH_TOKEN_EXPIRED', 'Refresh token has expired or been invalidated', 401);
  }

  const user = await findById(userId);
  if (user === null) {
    throw new AuthError('USER_NOT_FOUND', 'User no longer exists', 401);
  }

  // Rotate: invalidate old token, issue new pair
  await redis.del(refreshKey(userId, tokenId));
  await redis.setex(blacklistKey(userId, tokenId), REFRESH_TTL_SECONDS, '1');

  const newTokenId = uuidv4();
  const newAccessToken = signAccessToken({
    userId,
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = signRefreshToken({ userId, tokenId: newTokenId });

  await redis.setex(refreshKey(userId, newTokenId), REFRESH_TTL_SECONDS, '1');

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const { userId, tokenId } = payload;

    const redis = getRedisClient();
    await Promise.all([
      redis.del(refreshKey(userId, tokenId)),
      redis.setex(blacklistKey(userId, tokenId), REFRESH_TTL_SECONDS, '1'),
    ]);
  } catch {
    // If the token is already invalid/expired, logout is still a success
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await findByEmail(email);

  // Always respond the same way to prevent user enumeration
  if (user === null) {
    return;
  }

  const userId = user._id.toHexString();
  const rawResetToken = randomBytes(32).toString('hex');
  const resetTokenHash = hashToken(rawResetToken);
  // Token format: "<userId>.<randomHex>" so we can look up by userId on reset
  const resetToken = `${userId}.${rawResetToken}`;

  const redis = getRedisClient();
  await redis.setex(resetKey(userId), RESET_TOKEN_TTL_SECONDS, resetTokenHash);

  await sendPasswordResetEmail(user.email, resetToken);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Token format: "<userId>.<randomHex>" — userId prefix enables O(1) Redis lookup.
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) {
    throw new AuthError('INVALID_RESET_TOKEN', 'Invalid or expired reset token', 400);
  }

  const userId = token.substring(0, dotIndex);
  const rawToken = token.substring(dotIndex + 1);
  const tokenHash = hashToken(rawToken);

  const redis = getRedisClient();
  const storedHash = await redis.get(resetKey(userId));

  if (storedHash === null || storedHash !== tokenHash) {
    throw new AuthError('INVALID_RESET_TOKEN', 'Invalid or expired reset token', 400);
  }

  const user = await findById(userId);
  if (user === null) {
    throw new AuthError('USER_NOT_FOUND', 'User not found', 404);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await updatePasswordHash(userId, passwordHash);

  // Invalidate the reset token immediately
  await redis.del(resetKey(userId));

  // Invalidate all refresh tokens for this user by scanning the pattern
  // Use SCAN to avoid blocking Redis
  const stream = redis.scanStream({ match: `refresh:${userId}:*`, count: 100 });

  await new Promise<void>((resolve, reject) => {
    const keysToDelete: string[] = [];

    stream.on('data', (keys: string[]) => {
      keysToDelete.push(...keys);
    });

    stream.on('end', () => {
      if (keysToDelete.length === 0) {
        resolve();
        return;
      }
      redis
        .del(...keysToDelete)
        .then(() => resolve())
        .catch(reject);
    });

    stream.on('error', reject);
  });
}

export async function verifyEmail(token: string): Promise<void> {
  // Token format: "<userId>.<randomHex>"
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) {
    throw new AuthError('INVALID_VERIFICATION_TOKEN', 'Invalid verification token', 400);
  }

  const userId = token.substring(0, dotIndex);
  const rawToken = token.substring(dotIndex + 1);
  const tokenHash = hashToken(rawToken);

  const redis = getRedisClient();
  const storedHash = await redis.get(verifyEmailKey(userId));

  if (storedHash === null || storedHash !== tokenHash) {
    throw new AuthError(
      'INVALID_VERIFICATION_TOKEN',
      'Invalid or expired verification token',
      400,
    );
  }

  await markEmailVerified(userId);
  await redis.del(verifyEmailKey(userId));
}
