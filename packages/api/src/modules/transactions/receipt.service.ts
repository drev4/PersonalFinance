import { createWorker } from 'tesseract.js';

export interface ScanReceiptResponse {
  amount?: number;
  date?: string;
  merchant?: string;
  suggestedCategory?: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    'mercadona',
    'lidl',
    'carrefour',
    'aldi',
    'alcampo',
    'dia',
    'eroski',
    'supercor',
    'el corte ingles',
    'consum',
    'bon preu',
    'caprabo',
    'restaurante',
    'restaurant',
    'cafe',
    'cafeteria',
    'bar ',
    'mcdonald',
    'burger king',
    'kfc',
    'telepizza',
    'dominos',
    'subway',
    'starbucks',
  ],
  Transport: [
    'repsol',
    'bp ',
    'galp',
    'cepsa',
    'shell',
    'renfe',
    'metro',
    'bus ',
    'taxi',
    'cabify',
    'uber',
    'blablacar',
    'parking',
    'autopista',
    'peaje',
  ],
  Health: [
    'farmacia',
    'pharmacy',
    'clinica',
    'clinica',
    'doctor',
    'hospital',
    'optica',
    'dental',
    'parafarmacia',
  ],
  Shopping: [
    'amazon',
    'zara',
    'mango',
    'h&m',
    'primark',
    'inditex',
    'ikea',
    'media markt',
    'fnac',
    'el corte ingles',
  ],
  Entertainment: [
    'netflix',
    'spotify',
    'steam',
    'cine',
    'cinema',
    'teatro',
    'ticketmaster',
    'entradas',
  ],
  Home: [
    'leroy merlin',
    'bricodepot',
    'brico',
    'electricidad',
    'gas natural',
    'iberdrola',
    'endesa',
    'vodafone',
    'movistar',
    'orange',
  ],
};

const TOTAL_KEYWORDS =
  /\b(total|importe|a pagar|amount due|total due|importe total|total a pagar|subtotal)\b/i;

const DATE_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/(\d{2})\/(\d{2})\/(\d{4})/, (m) => `${m[3]}-${m[2]}-${m[1]}`],
  [/(\d{4})-(\d{2})-(\d{2})/, (m) => `${m[1]}-${m[2]}-${m[3]}`],
  [/(\d{2})-(\d{2})-(\d{4})/, (m) => `${m[3]}-${m[2]}-${m[1]}`],
  [
    /(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})/i,
    (m) => {
      const months: Record<string, string> = {
        ene: '01',
        feb: '02',
        mar: '03',
        abr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        ago: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dic: '12',
      };
      return `${m[3]!}-${months[m[2]!.toLowerCase()]}-${m[1]!.padStart(2, '0')}`;
    },
  ],
  [
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
    (m) => {
      const months: Record<string, string> = {
        jan: '01',
        feb: '02',
        mar: '03',
        apr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        aug: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dec: '12',
      };
      return `${m[3]!}-${months[m[2]!.toLowerCase()]}-${m[1]!.padStart(2, '0')}`;
    },
  ],
];

const parseCents = (raw: string): number | undefined => {
  const hasDot = raw.includes('.');
  const hasComma = raw.includes(',');
  let normalized: string;

  if (hasDot && hasComma) {
    // "1.234,56" or "1,234.56" — rightmost separator is decimal
    const lastDot = raw.lastIndexOf('.');
    const lastComma = raw.lastIndexOf(',');
    normalized =
      lastDot > lastComma ? raw.replace(/,/g, '') : raw.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    // "2.05" → decimal  /  "1.500" → thousands
    const afterDot = raw.split('.').pop() ?? '';
    normalized = afterDot.length <= 2 ? raw : raw.replace(/\./g, '');
  } else if (hasComma) {
    // "12,50" → decimal  /  "1,500" → thousands
    const afterComma = raw.split(',').pop() ?? '';
    normalized = afterComma.length <= 2 ? raw.replace(',', '.') : raw.replace(/,/g, '');
  } else {
    normalized = raw;
  }

  const n = parseFloat(normalized);
  if (isNaN(n) || n <= 0) return undefined;
  return Math.round(n * 100);
};

function extractAmount(lines: string[]): number | undefined {
  // Collect amounts from ALL lines that contain total keywords, then return the max
  // (handles tickets with subtotal + "Total con IVA" — we want the largest/final total)
  const totalAmounts: number[] = [];
  for (const line of lines) {
    if (TOTAL_KEYWORDS.test(line)) {
      const nums = [...line.matchAll(/[\d.,]+/g)]
        .map((m) => parseCents(m[0]))
        .filter((n): n is number => n !== undefined);
      totalAmounts.push(...nums);
    }
  }
  if (totalAmounts.length > 0) return Math.max(...totalAmounts);

  // Fallback: largest monetary value in the whole text
  const all =
    lines
      .join('\n')
      .match(/[\d.,]+/g)
      ?.map((s) => parseCents(s))
      .filter((n): n is number => n !== undefined && n > 0) ?? [];
  return all.length > 0 ? Math.max(...all) : undefined;
}

function extractDate(text: string): string | undefined {
  for (const [pattern, format] of DATE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      try {
        const iso = format(m);
        if (!isNaN(new Date(iso).getTime())) return iso;
      } catch {
        // try next pattern
      }
    }
  }
  return undefined;
}

function extractMerchant(lines: string[]): string | undefined {
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 3 && /[a-záéíóúñ]/i.test(trimmed) && !/^\d/.test(trimmed)) {
      return trimmed.slice(0, 60);
    }
  }
  return undefined;
}

function suggestCategory(merchant: string | undefined): string | undefined {
  if (!merchant) return undefined;
  const lower = merchant.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return undefined;
}

export function parseReceiptText(text: string): ScanReceiptResponse {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const amount = extractAmount(lines);
  const date = extractDate(text);
  const merchant = extractMerchant(lines);
  const suggestedCategory = suggestCategory(merchant);

  return {
    ...(amount !== undefined && { amount }),
    ...(date !== undefined && { date }),
    ...(merchant !== undefined && { merchant }),
    ...(suggestedCategory !== undefined && { suggestedCategory }),
  };
}

export async function scanReceipt(base64Image: string): Promise<ScanReceiptResponse> {
  const worker = await createWorker(['eng', 'spa']);
  try {
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const { data } = await worker.recognize(imageBuffer);
    return parseReceiptText(data.text);
  } catch {
    return {};
  } finally {
    await worker.terminate();
  }
}
