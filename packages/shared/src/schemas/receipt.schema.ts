import { z } from 'zod';

export const ScanReceiptResponseSchema = z.object({
  amount: z.number().int().optional(),
  date: z.string().optional(),
  merchant: z.string().optional(),
  suggestedCategory: z.string().optional(),
});

export type ScanReceiptResponse = z.infer<typeof ScanReceiptResponseSchema>;
