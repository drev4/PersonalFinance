import { z } from 'zod';

export const ConditionOperatorEnum = z.enum([
  'equals',
  'contains',
  'startsWith',
  'endsWith',
  'regex',
  'greaterThan',
  'lessThan',
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorEnum>;

export const RuleConditionSchema = z.object({
  field: z.enum(['description', 'amount', 'merchant']),
  operator: ConditionOperatorEnum,
  value: z.string(),
});

export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const CategoryRuleSchema = z.object({
  id: z.string().min(1, 'Rule ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().optional(),
  conditions: z.array(RuleConditionSchema).min(1, 'At least one condition is required'),
  isActive: z.boolean().default(true),
  priority: z.number().int().nonnegative().default(0),
  matchAll: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type CategoryRule = z.infer<typeof CategoryRuleSchema>;
