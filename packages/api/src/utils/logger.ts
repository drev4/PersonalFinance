import pino, { type Logger } from 'pino';
import env from '../config/env.js';

/**
 * Central application logger.
 *
 * Exported as a singleton so every module shares the same transport/redaction
 * configuration. Always prefer this logger over `console.*` — console calls
 * bypass redaction and can leak PII (passwords, API secrets, encryption IVs,
 * 2FA secrets) into stdout/files.
 *
 * Redaction paths below cover the most common PII/secret fields used in the
 * codebase (auth, integrations, users, crypto utilities). Extend as needed.
 */

// Paths that should be redacted from any logged object. Pino replaces the
// matching value with "[Redacted]" without mutating the source object.
const REDACT_PATHS = [
  // Auth / credentials
  'password',
  'newPassword',
  'currentPassword',
  'passwordHash',
  'refreshToken',
  'accessToken',
  'token',

  // Encryption / 2FA
  'encryptedPayload',
  'iv',
  'twoFactorSecret',
  'twoFactorCode',

  // Integration provider secrets
  'apiKey',
  'apiSecret',
  'secret',
  'clientSecret',

  // Nested occurrences (one level deep for typical request/response shapes)
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.passwordHash',
  '*.refreshToken',
  '*.accessToken',
  '*.token',
  '*.encryptedPayload',
  '*.iv',
  '*.twoFactorSecret',
  '*.twoFactorCode',
  '*.apiKey',
  '*.apiSecret',
  '*.secret',
  '*.clientSecret',

  // Common Fastify request shape
  'req.headers.authorization',
  'req.headers.cookie',
  'request.headers.authorization',
  'request.headers.cookie',
  'headers.authorization',
  'headers.cookie',
];

const basePinoOptions: pino.LoggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: REDACT_PATHS,
    censor: '[Redacted]',
    remove: false,
  },
  base: {
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

// In non-production use pino-pretty for human-readable output.
const loggerOptions: pino.LoggerOptions =
  env.NODE_ENV === 'production'
    ? basePinoOptions
    : {
        ...basePinoOptions,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      };

export const logger: Logger = pino(loggerOptions);

/**
 * Returns a child logger tagged with a module name. Useful to disambiguate
 * output from different subsystems while keeping the shared redaction config.
 */
export function createChildLogger(name: string): Logger {
  return logger.child({ module: name });
}

export default logger;
