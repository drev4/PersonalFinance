import { z } from 'zod';

export const AccountTypeEnum = z.enum([
  'checking',
  'savings',
  'investment',
  'credit_card',
  'loan',
  'mortgage',
  'crypto_wallet',
  'cash',
  'brokerage',
  'retirement',
]);

export type AccountType = z.infer<typeof AccountTypeEnum>;

export const AccountSchema = z.object({
  id: z.string().min(1, 'Account ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Account name is required'),
  type: AccountTypeEnum,
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  balance: z.number().nonnegative('Balance cannot be negative'),
  initialBalance: z.number(),
  isActive: z.boolean().default(true),
  isFavorite: z.boolean().default(false),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  syncEnabled: z.boolean().default(false),
  lastSyncedAt: z.date().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Account = z.infer<typeof AccountSchema>;
