import fp from 'fastify-plugin';
import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

/**
 * Applies defence-in-depth response headers that complement `@fastify/helmet`.
 *
 * - `X-Content-Type-Options: nosniff` — blocks MIME-type sniffing in browsers.
 * - `X-Frame-Options: DENY`         — forbids framing; pairs with CSP frame-ancestors.
 * - `Cache-Control: no-store`       — only on sensitive routes so responses
 *                                      containing PII (auth tokens, balances,
 *                                      user profile data) never hit a shared
 *                                      cache or browser disk cache.
 *
 * Helmet already emits some of these headers by default; we set them again on
 * `onSend` so they survive any downstream handler that might overwrite them.
 */

/** Route prefixes whose responses must never be cached. */
const NO_STORE_PREFIXES = [
  '/auth/',
  '/users/',
  '/accounts/',
  '/transactions/',
  '/holdings/',
];

function needsNoStore(url: string): boolean {
  // Strip query string before matching the pathname.
  const queryIndex = url.indexOf('?');
  const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);
  for (const prefix of NO_STORE_PREFIXES) {
    if (pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

async function securityHeadersPlugin(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  fastify.addHook(
    'onSend',
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');

      if (needsNoStore(request.url)) {
        reply.header('Cache-Control', 'no-store');
        reply.header('Pragma', 'no-cache');
      }

      return payload;
    },
  );
}

export default fp(securityHeadersPlugin, {
  name: 'security-headers-plugin',
  fastify: '4.x',
});
