import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Invalid color format'),
  icon: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  parent: z.string().optional(),
  order: z.number().int().nonnegative().default(0),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Category = z.infer<typeof CategorySchema>;
