import { FastifyRequest, FastifyReply } from 'fastify';

export const authenticateRequest = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);

    // TODO: Validate JWT token here
    // This is a placeholder for token validation logic
    if (!token) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  } catch (error) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
};
