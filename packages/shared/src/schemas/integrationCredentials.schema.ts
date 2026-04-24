import { z } from 'zod';

export const IntegrationTypeEnum = z.enum([
  'binance',
  'coinbase',
  'plaid',
  'finnhub',
  'marketstack',
  'crypto_compare',
  'alpha_vantage',
]);

export type IntegrationType = z.infer<typeof IntegrationTypeEnum>;

export const IntegrationCredentialsSchema = z.object({
  id: z.string().min(1, 'Integration ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  type: IntegrationTypeEnum,
  name: z.string().min(1, 'Integration name is required'),
  credentials: z.record(z.string(), z.string()).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
  lastSyncedAt: z.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type IntegrationCredentials = z.infer<typeof IntegrationCredentialsSchema>;
