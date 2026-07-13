import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(),
}));

import { createWorker } from 'tesseract.js';
import { parseReceiptText, scanReceipt } from '../receipt.service.js';

const mockWorker = {
  recognize: vi.fn(),
  terminate: vi.fn(),
};

beforeEach(() => {
  vi.mocked(createWorker).mockResolvedValue(mockWorker as any);
  mockWorker.terminate.mockResolvedValue(undefined);
});

describe('parseReceiptText', () => {
  it('extracts amount from TOTAL line', () => {
    const text = 'Mercadona\n12/05/2026\nLeche 1.20\nPan 0.85\nTOTAL 2.05\nGracias';
    const result = parseReceiptText(text);
    expect(result.amount).toBe(205);
  });

  it('extracts amount with comma decimal separator', () => {
    const text = 'Supermercado\nTotal a pagar 12,50';
    const result = parseReceiptText(text);
    expect(result.amount).toBe(1250);
  });

  it('returns largest value on TOTAL line when multiple numbers present', () => {
    const text = 'Ref: 123\nTotal 45.00\nIVA 4.50\nTotal con IVA 49.50';
    const result = parseReceiptText(text);
    expect(result.amount).toBe(4950);
  });

  it('returns undefined amount when no TOTAL keyword and no numbers', () => {
    const result = parseReceiptText('Sin importe aqui');
    expect(result.amount).toBeUndefined();
  });

  it('extracts date in DD/MM/YYYY format', () => {
    const text = 'Tienda 12/05/2026 Total 10.00';
    const result = parseReceiptText(text);
    expect(result.date).toBe('2026-05-12');
  });

  it('extracts date in YYYY-MM-DD format', () => {
    const text = 'Tienda 2026-05-12 Total 10.00';
    const result = parseReceiptText(text);
    expect(result.date).toBe('2026-05-12');
  });

  it('extracts merchant from first text line', () => {
    const text = 'Mercadona S.A.\n12/05/2026\nTotal 5.00';
    const result = parseReceiptText(text);
    expect(result.merchant).toBe('Mercadona S.A.');
  });

  it('skips lines that start with digits when extracting merchant', () => {
    const text = '12/05/2026\nRestaurante El Mar\nTotal 30.00';
    const result = parseReceiptText(text);
    expect(result.merchant).toBe('Restaurante El Mar');
  });

  it('suggests Food category for supermarket names', () => {
    const result = parseReceiptText('Mercadona\nTotal 10.00');
    expect(result.suggestedCategory).toBe('Food');
  });

  it('suggests Transport category for fuel stations', () => {
    const result = parseReceiptText('REPSOL STATION\nTotal 60.00');
    expect(result.suggestedCategory).toBe('Transport');
  });

  it('returns undefined suggestedCategory when merchant unknown', () => {
    const result = parseReceiptText('Tienda Desconocida XYZ\nTotal 10.00');
    expect(result.suggestedCategory).toBeUndefined();
  });

  it('returns empty object for empty text', () => {
    const result = parseReceiptText('');
    expect(result).toEqual({});
  });
});

describe('scanReceipt', () => {
  it('returns parsed fields from OCR text', async () => {
    mockWorker.recognize.mockResolvedValue({
      data: { text: 'Mercadona\n12/05/2026\nTotal 15.50' },
    });

    const result = await scanReceipt('aGVsbG8=');
    expect(result.amount).toBe(1550);
    expect(result.date).toBe('2026-05-12');
    expect(result.merchant).toBe('Mercadona');
    expect(result.suggestedCategory).toBe('Food');
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('returns empty object when Tesseract throws', async () => {
    mockWorker.recognize.mockRejectedValue(new Error('OCR failed'));

    const result = await scanReceipt('aGVsbG8=');
    expect(result).toEqual({});
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});
