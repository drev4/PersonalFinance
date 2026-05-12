import { useMutation } from '@tanstack/react-query';
import client from './client';

export interface ScanReceiptResult {
  amount?: number;
  date?: string;
  merchant?: string;
  suggestedCategory?: string;
}

export const useScanReceipt = () =>
  useMutation({
    mutationFn: async (base64Image: string): Promise<ScanReceiptResult> => {
      const response = await client.post<{ data: ScanReceiptResult }>(
        '/transactions/scan-receipt',
        { image: base64Image, mimeType: 'image/jpeg' },
        { timeout: 30000 },
      );
      return response.data.data;
    },
  });
