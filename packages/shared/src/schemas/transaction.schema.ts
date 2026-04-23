import { z } from 'zod';

export const TransactionTypeEnum = z.enum(['income', 'expense', 'transfer']);

export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const RecurrenceFrequencyEnum = z.enum([
  'once',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annual',
]);

export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencyEnum>;

export const RecurringSchema = z.object({
  frequency: RecurrenceFrequencyEnum,
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
});

export type Recurring = z.infer<typeof RecurringSchema>;

export const TransactionSchema = z.object({
  id: z.string().min(1, 'Transaction ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  categoryId: z.string().optional(),
  type: TransactionTypeEnum,
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  date: z.date(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  recurring: RecurringSchema.optional(),
  relatedTransactionId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        fileName: z.string(),
        fileType: z.string(),
      }),
    )
    .default([]),
  isReconciled: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
