import type { FastifyRequest } from 'fastify';

/**
 * Reusable rate-limit configurations.
 *
 * These objects are intended to be passed directly to Fastify route `config`
 * (per-route) or to `fastify.register(rateLimit, …)` (global/scoped) so every
 * subsystem shares the same well-tuned budgets.
 *
 * The global rate-limit plugin is registered against Redis in `server.ts`, so
 * these configs are honoured across every API instance (horizontally scalable).
 *
 * Header semantics:
 *   - `x-ratelimit-limit`     — the configured `max` for the window
 *   - `x-ratelimit-remaining` — how many requests the client has left
 *   - `x-ratelimit-reset`     — seconds until the window resets
 *   - `retry-after`           — set on 429 responses
 *
 * The plugin emits those headers by default. We keep that behaviour explicit
 * via `addHeaders` on the base config used when registering the plugin.
 */

export interface RateLimitConfig {
  max: number;
  timeWindow: string;
  /** Number of consecutive "over the limit" hits that trigger a ban. */
  ban?: number;
  /** Skip function — useful to exempt OPTIONS/health from counting. */
  skip?: (request: FastifyRequest) => boolean;
  /** Custom key generator — defaults to request.ip in the plugin. */
  keyGenerator?: (request: FastifyRequest) => string;
  /** Fastify hook to attach the limiter to — defaults to `onRequest`. */
  hook?: 'onRequest' | 'preParsing' | 'preValidation' | 'preHandler';
}

/**
 * Sensitive auth endpoints (login, register, reset-password).
 * Tight budget to slow down credential stuffing; ban an IP after 3 bursts.
 */
export const authRateLimit: RateLimitConfig = {
  max: 10,
  timeWindow: '15 minutes',
  ban: 3,
};

/** General API budget — applied globally. */
export const apiRateLimit: RateLimitConfig = {
  max: 100,
  timeWindow: '15 minutes',
};

/** Heavy endpoints (PDFs, full-year reports). CPU/RAM bound. */
export const heavyRateLimit: RateLimitConfig = {
  max: 5,
  timeWindow: '1 minute',
};

/** Ticker search / external API proxy endpoints. */
export const searchRateLimit: RateLimitConfig = {
  max: 30,
  timeWindow: '1 minute',
};

/**
 * Standard error payload returned by every rate-limited scope. Kept here so
 * the shape stays consistent with the rest of the API error envelope.
 */
export function rateLimitErrorBuilder(
  _request: FastifyRequest,
  context: { after: string; max: number; ttl: number; ban: boolean },
): object {
  return {
    error: {
      code: context.ban ? 'RATE_LIMIT_BANNED' : 'RATE_LIMIT_EXCEEDED',
      message: context.ban
        ? 'Too many failed attempts. Your IP has been temporarily blocked.'
        : `Too many requests. Please retry after ${context.after}.`,
    },
  };
}

/** Skip OPTIONS preflight (they shouldn't count against the budget). */
export function skipPreflight(request: FastifyRequest): boolean {
  return request.method === 'OPTIONS';
}

/**
 * `allowList` callback for `@fastify/rate-limit`. The plugin exposes
 * `allowList` (not `skip`) as the supported hook to bypass the limiter for a
 * given request. Returning `true` skips the budget for this request.
 */
export function rateLimitAllowList(request: FastifyRequest, _key: string): boolean {
  // Don't charge OPTIONS preflight, health checks, or the root liveness probe.
  if (request.method === 'OPTIONS') return true;
  const queryIndex = request.url.indexOf('?');
  const pathname = queryIndex === -1 ? request.url : request.url.slice(0, queryIndex);
  if (pathname === '/health' || pathname === '/') return true;
  return false;
}
