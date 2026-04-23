import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAuth } from '../../middlewares/authenticate.js';
import { CategoryRuleModel } from './categoryRule.model.js';

const CreateRuleSchema = z.object({
  categoryId: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required'),
  priority: z.number().int().nonnegative().optional().default(0),
});

const UpdateRuleSchema = z.object({
  categoryId: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).min(1).optional(),
  priority: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export async function registerCategoryRuleRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /category-rules
  fastify.get(
    '/category-rules',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const rules = await CategoryRuleModel.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ priority: -1 })
        .exec();
      return reply.send({ data: rules });
    },
  );

  // POST /category-rules
  fastify.post(
    '/category-rules',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const body = CreateRuleSchema.parse(request.body);

      const rule = new CategoryRuleModel({
        userId: new mongoose.Types.ObjectId(userId),
        categoryId: new mongoose.Types.ObjectId(body.categoryId),
        keywords: body.keywords,
        priority: body.priority,
        isActive: true,
      });
      await rule.save();

      return reply.status(201).send({ data: rule });
    },
  );

  // PATCH /category-rules/:id
  fastify.patch(
    '/category-rules/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };
      const body = UpdateRuleSchema.parse(request.body);

      const updatePayload: Record<string, unknown> = {};
      if (body.categoryId !== undefined) {
        updatePayload['categoryId'] = new mongoose.Types.ObjectId(body.categoryId);
      }
      if (body.keywords !== undefined) updatePayload['keywords'] = body.keywords;
      if (body.priority !== undefined) updatePayload['priority'] = body.priority;
      if (body.isActive !== undefined) updatePayload['isActive'] = body.isActive;

      const rule = await CategoryRuleModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(userId),
        },
        { $set: updatePayload },
        { new: true, runValidators: true },
      ).exec();

      if (rule === null) {
        return reply.status(404).send({
          error: { code: 'RULE_NOT_FOUND', message: 'Category rule not found' },
        });
      }

      return reply.send({ data: rule });
    },
  );

  // DELETE /category-rules/:id
  fastify.delete(
    '/category-rules/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params as { id: string };

      const result = await CategoryRuleModel.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId),
      }).exec();

      if (result === null) {
        return reply.status(404).send({
          error: { code: 'RULE_NOT_FOUND', message: 'Category rule not found' },
        });
      }

      return reply.status(204).send();
    },
  );
}
