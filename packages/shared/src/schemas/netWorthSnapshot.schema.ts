import { z } from 'zod';

export const NetWorthComponentSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  accountName: z.string(),
  accountType: z.string(),
  value: z.number(),
  currency: z.string().length(3),
});

export type NetWorthComponent = z.infer<typeof NetWorthComponentSchema>;

export const NetWorthSnapshotSchema = z.object({
  id: z.string().min(1, 'Net worth snapshot ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  baseCurrency: z.string().length(3, 'Currency code must be 3 characters'),
  totalAssets: z.number().nonnegative(),
  totalLiabilities: z.number().nonnegative(),
  netWorth: z.number(),
  assets: z.array(NetWorthComponentSchema),
  liabilities: z.array(NetWorthComponentSchema),
  timestamp: z.date(),
  previousNetWorth: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  createdAt: z.date(),
});

export type NetWorthSnapshot = z.infer<typeof NetWorthSnapshotSchema>;
