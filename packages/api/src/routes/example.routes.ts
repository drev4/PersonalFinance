import { FastifyInstance } from 'fastify';
import type { User } from '@finanzas/shared';

export const registerExampleRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // GET /api/example
  fastify.get<{ Reply: { message: string } }>('/example', async (request, reply) => {
    return reply.send({ message: 'Example route working' });
  });

  // POST /api/example
  fastify.post<{ Body: { name: string }; Reply: { success: boolean; name: string } }>(
    '/example',
    async (request, reply) => {
      const { name } = request.body;
      return reply.send({ success: true, name });
    },
  );
};
