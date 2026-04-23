import { z } from 'zod';

export const BudgetPeriodEnum = z.enum(['monthly', 'quarterly', 'annual']);

export type BudgetPeriod = z.infer<typeof BudgetPeriodEnum>;

export const BudgetSchema = z.object({
  id: z.string().min(1, 'Budget ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Budget name is required'),
  limit: z.number().positive('Budget limit must be positive'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  period: BudgetPeriodEnum,
  startDate: z.date(),
  endDate: z.date().optional(),
  spent: z.number().nonnegative().default(0),
  alerts: z
    .object({
      enabled: z.boolean().default(true),
      threshold: z.number().min(0).max(100, 'Threshold must be between 0 and 100').default(80),
    })
    .optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Budget = z.infer<typeof BudgetSchema>;
