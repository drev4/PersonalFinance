import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteRead,
} from './notification.service.js';

// ---- Zod schemas -------------------------------------------------------------

const ListQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  page: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 20)),
});

const MarkReadBodySchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one notification id is required'),
});

// ---- Route registration ------------------------------------------------------

export async function registerNotificationRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /notifications
  // Lists paginated notifications for the authenticated user.
  fastify.get(
    '/notifications',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const query = ListQuerySchema.parse(request.query);

      const result = await getUserNotifications(userId, {
        unreadOnly: query.unreadOnly,
        page: query.page,
        limit: query.limit,
      });

      return reply.send({ data: result.data, meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }});
    },
  );

  // GET /notifications/unread-count
  // Returns the unread badge count. Declared before /:id to avoid route conflict.
  fastify.get(
    '/notifications/unread-count',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const count = await getUnreadCount(userId);
      return reply.send({ count });
    },
  );

  // PATCH /notifications/read-all
  // Marks all notifications for the user as read.
  fastify.patch(
    '/notifications/read-all',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      await markAllAsRead(userId);
      return reply.status(204).send();
    },
  );

  // PATCH /notifications/:id/read
  // Marks a specific notification as read.
  fastify.patch(
    '/notifications/:id/read',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      await markAsRead(userId, [id]);
      return reply.status(204).send();
    },
  );

  // DELETE /notifications/read
  // Deletes all read notifications for the user.
  fastify.delete(
    '/notifications/read',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const deleted = await deleteRead(userId);
      return reply.send({ deleted });
    },
  );
}
