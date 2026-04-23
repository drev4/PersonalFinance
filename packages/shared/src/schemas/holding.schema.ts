import { z } from 'zod';

export const AssetTypeEnum = z.enum([
  'stock',
  'etf',
  'mutual_fund',
  'bond',
  'cryptocurrency',
  'commodity',
  'real_estate',
  'cash',
  'other',
]);

export type AssetType = z.infer<typeof AssetTypeEnum>;

export const HoldingSchema = z.object({
  id: z.string().min(1, 'Holding ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  accountId: z.string().min(1, 'Account ID is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  name: z.string().min(1, 'Holding name is required'),
  assetType: AssetTypeEnum,
  quantity: z.number().positive('Quantity must be positive'),
  costPerUnit: z.number().nonnegative('Cost per unit cannot be negative'),
  totalCost: z.number().nonnegative('Total cost cannot be negative'),
  currentPrice: z.number().nonnegative('Current price cannot be negative'),
  currentValue: z.number().nonnegative('Current value cannot be negative'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  gainLoss: z.number(),
  gainLossPercent: z.number(),
  exchange: z.string().optional(),
  lastUpdatedAt: z.date(),
  purchaseDate: z.date(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type Holding = z.infer<typeof HoldingSchema>;
