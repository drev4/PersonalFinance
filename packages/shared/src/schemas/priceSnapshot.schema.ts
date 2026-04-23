import { z } from 'zod';

export const PriceSnapshotSchema = z.object({
  id: z.string().min(1, 'Price snapshot ID is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  price: z.number().positive('Price must be positive'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  timestamp: z.date(),
  source: z.enum(['binance', 'finnhub', 'marketstack', 'crypto_compare', 'alpha_vantage']),
  change24h: z.number().optional(),
  changePercent24h: z.number().optional(),
  highPrice: z.number().optional(),
  lowPrice: z.number().optional(),
  volume: z.number().optional(),
  marketCap: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PriceSnapshot = z.infer<typeof PriceSnapshotSchema>;
