import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

// ---- Mock Redis before importing any service --------------------------------
// Vitest's vi.mock factory runs in a special CJS context; require() works here
// even in ESM projects when using tsx/vitest transform.
vi.mock('../../../config/redis.js', async () => {
  const { default: IORedisMock } = await import('ioredis-mock');
  const instance = new IORedisMock();

  return {
    getRedisClient: () => instance,
    createRedisClient: () => instance,
    closeRedisClient: async (): Promise<void> => undefined,
  };
});

// ---- Mock email so we never actually send --------------------------------
vi.mock('../../../utils/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));

// ---- Import after mocks ---------------------------------------------------
import {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  AuthError,
} from '../auth.service.js';
import { getRedisClient } from '../../../config/redis.js';
import { sendPasswordResetEmail, sendEmailVerification } from '../../../utils/email.js';
import { UserModel } from '../../users/user.model.js';
import { verifyRefreshToken } from '../../../utils/jwt.js';

// ---- Test setup ------------------------------------------------------------

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  // Clear all collections and Redis before each test
  await UserModel.deleteMany({});
  const redis = getRedisClient();
  await redis.flushall();
  vi.clearAllMocks();
});

// ---- Helpers ---------------------------------------------------------------

const validRegisterDTO = {
  email: 'test@example.com',
  password: 'Password1',
  name: 'Test User',
};

async function registerUser(
  overrides: Partial<typeof validRegisterDTO> = {},
): ReturnType<typeof register> {
  return register({ ...validRegisterDTO, ...overrides });
}

// ============================================================================
// register()
// ============================================================================

describe('register()', () => {
  it('creates a new user and returns tokens + safe user', async () => {
    const result = await registerUser();

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');
    expect(result.user.role).toBe('user');
    expect(result.user.emailVerified).toBe(false);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();

    // Ensure passwordHash is not present on the returned SafeUser
    expect(Object.keys(result.user)).not.toContain('passwordHash');
    expect(Object.keys(result.user)).not.toContain('twoFactorSecret');
  });

  it('stores passwordHash in the database (not plaintext)', async () => {
    await registerUser();
    const stored = await UserModel.findOne({ email: 'test@example.com' });
    expect(stored).not.toBeNull();
    expect(stored!.passwordHash).not.toBe('Password1');
    const isHashed = await bcrypt.compare('Password1', stored!.passwordHash);
    expect(isHashed).toBe(true);
  });

  it('sends a verification email after registration', async () => {
    await registerUser();
    // Give async fire-and-forget time to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(sendEmailVerification).toHaveBeenCalledOnce();
    expect(sendEmailVerification).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('.'),
    );
  });

  it('stores the refresh token in Redis', async () => {
    const result = await registerUser();
    const payload = verifyRefreshToken(result.refreshToken);
    const redis = getRedisClient();
    const exists = await redis.exists(`refresh:${payload.userId}:${payload.tokenId}`);
    expect(exists).toBe(1);
  });

  it('throws EMAIL_ALREADY_EXISTS when email is taken', async () => {
    await registerUser();
    const error = await registerUser().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('EMAIL_ALREADY_EXISTS');
    expect((error as AuthError).statusCode).toBe(409);
  });

  it('normalises email to lowercase', async () => {
    const result = await registerUser({ email: 'UPPER@Example.COM' });
    expect(result.user.email).toBe('upper@example.com');
  });
});

// ============================================================================
// login()
// ============================================================================

describe('login()', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('returns tokens and safe user with valid credentials', async () => {
    const result = await login({ email: 'test@example.com', password: 'Password1' });
    expect(result.user.email).toBe('test@example.com');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('throws INVALID_CREDENTIALS for wrong password', async () => {
    const error = await login({
      email: 'test@example.com',
      password: 'WrongPassword1',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('INVALID_CREDENTIALS');
    expect((error as AuthError).statusCode).toBe(401);
  });

  it('throws INVALID_CREDENTIALS for non-existent email', async () => {
    const error = await login({
      email: 'nobody@example.com',
      password: 'Password1',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('INVALID_CREDENTIALS');
    expect((error as AuthError).statusCode).toBe(401);
  });

  it('does not expose passwordHash in the returned user', async () => {
    const result = await login({ email: 'test@example.com', password: 'Password1' });
    expect(Object.keys(result.user)).not.toContain('passwordHash');
  });

  it('stores a new refresh token in Redis on each login', async () => {
    const r1 = await login({ email: 'test@example.com', password: 'Password1' });
    const r2 = await login({ email: 'test@example.com', password: 'Password1' });

    const p1 = verifyRefreshToken(r1.refreshToken);
    const p2 = verifyRefreshToken(r2.refreshToken);

    expect(p1.tokenId).not.toBe(p2.tokenId);

    const redis = getRedisClient();
    const e1 = await redis.exists(`refresh:${p1.userId}:${p1.tokenId}`);
    const e2 = await redis.exists(`refresh:${p2.userId}:${p2.tokenId}`);
    expect(e1).toBe(1);
    expect(e2).toBe(1);
  });
});

// ============================================================================
// refreshTokens()
// ============================================================================

describe('refreshTokens()', () => {
  it('rotates tokens: old token is revoked, new pair is issued', async () => {
    const { refreshToken: oldToken } = await registerUser();
    const oldPayload = verifyRefreshToken(oldToken);

    const result = await refreshTokens(oldToken);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(oldToken);

    const redis = getRedisClient();

    // Old token should be blacklisted
    const blacklisted = await redis.exists(
      `blacklist:${oldPayload.userId}:${oldPayload.tokenId}`,
    );
    expect(blacklisted).toBe(1);

    // Old key should be gone from whitelist
    const whitelisted = await redis.exists(
      `refresh:${oldPayload.userId}:${oldPayload.tokenId}`,
    );
    expect(whitelisted).toBe(0);

    // New token should be in whitelist
    const newPayload = verifyRefreshToken(result.refreshToken);
    const newWhitelisted = await redis.exists(
      `refresh:${newPayload.userId}:${newPayload.tokenId}`,
    );
    expect(newWhitelisted).toBe(1);
  });

  it('throws REFRESH_TOKEN_REVOKED for a blacklisted token', async () => {
    const { refreshToken } = await registerUser();
    // Logout to blacklist
    await logout(refreshToken);

    const error = await refreshTokens(refreshToken).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    const authError = error as AuthError;
    expect(['REFRESH_TOKEN_REVOKED', 'REFRESH_TOKEN_EXPIRED']).toContain(authError.code);
    expect(authError.statusCode).toBe(401);
  });

  it('throws INVALID_REFRESH_TOKEN for a malformed token', async () => {
    const error = await refreshTokens('not.a.valid.token').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('INVALID_REFRESH_TOKEN');
    expect((error as AuthError).statusCode).toBe(401);
  });

  it('throws REFRESH_TOKEN_EXPIRED when Redis key does not exist', async () => {
    const { refreshToken } = await registerUser();
    const payload = verifyRefreshToken(refreshToken);

    // Manually delete the Redis key to simulate expiry
    const redis = getRedisClient();
    await redis.del(`refresh:${payload.userId}:${payload.tokenId}`);

    const error = await refreshTokens(refreshToken).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('REFRESH_TOKEN_EXPIRED');
  });
});

// ============================================================================
// logout()
// ============================================================================

describe('logout()', () => {
  it('blacklists the refresh token in Redis', async () => {
    const { refreshToken } = await registerUser();
    const payload = verifyRefreshToken(refreshToken);

    await logout(refreshToken);

    const redis = getRedisClient();
    const blacklisted = await redis.exists(
      `blacklist:${payload.userId}:${payload.tokenId}`,
    );
    expect(blacklisted).toBe(1);

    const whitelisted = await redis.exists(
      `refresh:${payload.userId}:${payload.tokenId}`,
    );
    expect(whitelisted).toBe(0);
  });

  it('does not throw when called with an already-invalid token', async () => {
    await expect(logout('garbage.token.here')).resolves.toBeUndefined();
  });

  it('prevents refreshTokens() from working after logout', async () => {
    const { refreshToken } = await registerUser();
    await logout(refreshToken);

    const error = await refreshTokens(refreshToken).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
  });
});

// ============================================================================
// forgotPassword()
// ============================================================================

describe('forgotPassword()', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('sends a reset email for an existing user', async () => {
    await forgotPassword('test@example.com');
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('.'),
    );
  });

  it('stores the reset token hash in Redis', async () => {
    await forgotPassword('test@example.com');
    const user = await UserModel.findOne({ email: 'test@example.com' });
    const redis = getRedisClient();
    const hash = await redis.get(`reset:${user!._id.toHexString()}`);
    expect(hash).toBeTruthy();
  });

  it('does NOT send an email for a non-existent user (silent fail)', async () => {
    await forgotPassword('nobody@example.com');
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

// ============================================================================
// resetPassword()
// ============================================================================

describe('resetPassword()', () => {
  it('full flow: request reset → reset → login with new password', async () => {
    await registerUser();

    let capturedToken = '';
    vi.mocked(sendPasswordResetEmail).mockImplementationOnce(
      async (_to: string, token: string) => {
        capturedToken = token;
      },
    );

    await forgotPassword('test@example.com');
    expect(capturedToken).not.toBe('');

    await resetPassword(capturedToken, 'NewPassword2');

    // Old password no longer works
    const loginOld = await login({
      email: 'test@example.com',
      password: 'Password1',
    }).catch((e: unknown) => e);
    expect(loginOld).toBeInstanceOf(AuthError);
    expect((loginOld as AuthError).code).toBe('INVALID_CREDENTIALS');

    // New password works
    const loginNew = await login({ email: 'test@example.com', password: 'NewPassword2' });
    expect(loginNew.user.email).toBe('test@example.com');
  });

  it('invalidates the reset token after use', async () => {
    await registerUser();

    let capturedToken = '';
    vi.mocked(sendPasswordResetEmail).mockImplementationOnce(
      async (_to: string, token: string) => {
        capturedToken = token;
      },
    );

    await forgotPassword('test@example.com');
    await resetPassword(capturedToken, 'NewPassword2');

    // Trying to use the same token again should fail
    const error = await resetPassword(capturedToken, 'AnotherPassword3').catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('INVALID_RESET_TOKEN');
  });

  it('throws INVALID_RESET_TOKEN for a bad token', async () => {
    const error = await resetPassword('badtoken', 'NewPassword2').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('INVALID_RESET_TOKEN');
  });

  it('invalidates active refresh tokens after reset', async () => {
    const { refreshToken } = await registerUser();
    const payload = verifyRefreshToken(refreshToken);

    let capturedToken = '';
    vi.mocked(sendPasswordResetEmail).mockImplementationOnce(
      async (_to: string, token: string) => {
        capturedToken = token;
      },
    );

    await forgotPassword('test@example.com');
    await resetPassword(capturedToken, 'NewPassword2');

    // The old refresh token key should no longer exist in Redis
    const redis = getRedisClient();
    const exists = await redis.exists(`refresh:${payload.userId}:${payload.tokenId}`);
    expect(exists).toBe(0);
  });
});

// ============================================================================
// verifyEmail()
// ============================================================================

describe('verifyEmail()', () => {
  it('marks emailVerified = true when given a valid token', async () => {
    let capturedToken = '';
    vi.mocked(sendEmailVerification).mockImplementationOnce(
      async (_to: string, token: string) => {
        capturedToken = token;
      },
    );

    await registerUser();
    // Give async email send time to execute
    await new Promise((r) => setTimeout(r, 50));

    expect(capturedToken).not.toBe('');

    await verifyEmail(capturedToken);

    const user = await UserModel.findOne({ email: 'test@example.com' });
    expect(user!.emailVerified).toBe(true);
  });

  it('throws INVALID_VERIFICATION_TOKEN for a bad token format', async () => {
    const error = await verifyEmail('badtoken').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  it('throws INVALID_VERIFICATION_TOKEN when token is already used', async () => {
    let capturedToken = '';
    vi.mocked(sendEmailVerification).mockImplementationOnce(
      async (_to: string, token: string) => {
        capturedToken = token;
      },
    );

    await registerUser();
    await new Promise((r) => setTimeout(r, 50));

    await verifyEmail(capturedToken);

    const error = await verifyEmail(capturedToken).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe('INVALID_VERIFICATION_TOKEN');
  });
});
