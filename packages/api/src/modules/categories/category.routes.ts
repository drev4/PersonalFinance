import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  getUserCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CategoryError,
} from './category.service.js';

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['income', 'expense']),
  parentId: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code'),
  icon: z.string().min(1, 'Icon is required'),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['income', 'expense']).optional(),
  parentId: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code')
    .optional(),
  icon: z.string().min(1).optional(),
});

function handleCategoryError(
  error: unknown,
  reply: Parameters<Parameters<FastifyInstance['get']>[2]>[1],
): ReturnType<Parameters<FastifyInstance['get']>[2]> {
  if (error instanceof CategoryError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

export async function registerCategoryRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /categories
  fastify.get(
    '/categories',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const categories = await getUserCategories(userId);

      // Build parent-child tree
      const map = new Map<string, Record<string, unknown>>();
      const roots: Record<string, unknown>[] = [];

      for (const cat of categories) {
        map.set(cat._id.toHexString(), { ...cat.toObject(), children: [] });
      }

      for (const [, node] of map) {
        const raw = node as { parentId?: { toHexString(): string }; children: unknown[] };
        if (raw.parentId !== undefined) {
          const parentNode = map.get(raw.parentId.toHexString());
          if (parentNode !== undefined) {
            (parentNode['children'] as unknown[]).push(node);
          } else {
            roots.push(node);
          }
        } else {
          roots.push(node);
        }
      }

      return reply.send({ data: roots });
    },
  );

  // POST /categories
  fastify.post(
    '/categories',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateCategorySchema.parse(request.body);

      try {
        const category = await createCategory(userId, {
          userId,
          name: body.name,
          type: body.type,
          parentId: body.parentId,
          color: body.color,
          icon: body.icon,
        });
        return reply.status(201).send({ data: category });
      } catch (err) {
        return handleCategoryError(err, reply);
      }
    },
  );

  // PATCH /categories/:id
  fastify.patch(
    '/categories/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateCategorySchema.parse(request.body);

      try {
        const category = await updateCategory(userId, id, body);
        return reply.send({ data: category });
      } catch (err) {
        return handleCategoryError(err, reply);
      }
    },
  );

  // DELETE /categories/:id
  fastify.delete(
    '/categories/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      try {
        await deleteCategory(userId, id);
        return reply.status(204).send();
      } catch (err) {
        return handleCategoryError(err, reply);
      }
    },
  );
}
