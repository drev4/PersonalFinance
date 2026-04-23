import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { sanitizeObject } from '../utils/sanitize.js';

/**
 * Fastify plugin that hardens every request body (and query/params) against
 * prototype pollution and oversized string payloads.
 *
 * Runs as a `preValidation` hook so Zod schemas still see the sanitized data.
 * The actual sanitization logic lives in `utils/sanitize.ts` so it can be
 * reused outside of Fastify (e.g. background jobs).
 */
export interface SanitizePluginOptions extends FastifyPluginOptions {
  /** Maximum length for any string value (default: 10_000). */
  maxStringLength?: number;
}

async function sanitizePlugin(
  fastify: FastifyInstance,
  opts: SanitizePluginOptions,
): Promise<void> {
  const maxStringLength = opts.maxStringLength ?? 10_000;

  fastify.addHook('preValidation', async (request) => {
    if (request.body !== undefined && request.body !== null && typeof request.body === 'object') {
      sanitizeObject(request.body, { maxStringLength });
    }
    if (request.query !== undefined && request.query !== null && typeof request.query === 'object') {
      sanitizeObject(request.query, { maxStringLength });
    }
    if (request.params !== undefined && request.params !== null && typeof request.params === 'object') {
      sanitizeObject(request.params, { maxStringLength });
    }
  });
}

export default fp(sanitizePlugin, {
  name: 'sanitize-plugin',
  fastify: '4.x',
});
