import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/authenticate.js';
import {
  generateMonthlyReport,
  generateYearlyReport,
  exportTransactionsCsv,
} from './report.service.js';

// ---- Zod schemas -------------------------------------------------------------

// Accepts both date-only (YYYY-MM-DD) and full ISO datetime strings
const flexDate = z.string().transform((s, ctx) => {
  const normalised = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s;
  const d = new Date(normalised);
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: 'custom', message: 'Invalid date format' });
    return z.NEVER;
  }
  return d;
});

const MonthlyQuerySchema = z.object({
  year: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 2000 && v <= 2100, 'Invalid year'),
  month: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 1 && v <= 12, 'Month must be between 1 and 12'),
});

const YearlyQuerySchema = z.object({
  year: z
    .string()
    .transform((v) => parseInt(v, 10))
    .refine((v) => v >= 2000 && v <= 2100, 'Invalid year'),
});

const ExportQuerySchema = z.object({
  format: z.literal('csv').default('csv'),
  from: flexDate.optional(),
  to: flexDate.optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer', 'adjustment']).optional(),
});

// ---- Rate-limit config -------------------------------------------------------

// Reports generate PDFs which are CPU-intensive — stricter limit than global
const REPORT_RATE_LIMIT = {
  max: 5,
  timeWindow: '1 minute',
};

// ---- Route registration ------------------------------------------------------

export async function registerReportRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // GET /reports/monthly?year=2026&month=3
  fastify.get(
    '/reports/monthly',
    {
      preHandler: requireAuth,
      config: { rateLimit: REPORT_RATE_LIMIT },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const query = MonthlyQuerySchema.parse(request.query);

      const pdfBuffer = await generateMonthlyReport(userId, query.year, query.month);

      const monthStr = String(query.month).padStart(2, '0');
      return reply
        .header('Content-Type', 'application/pdf')
        .header(
          'Content-Disposition',
          `attachment; filename="informe-mensual-${query.year}-${monthStr}.pdf"`,
        )
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    },
  );

  // GET /reports/yearly?year=2026
  fastify.get(
    '/reports/yearly',
    {
      preHandler: requireAuth,
      config: { rateLimit: REPORT_RATE_LIMIT },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const query = YearlyQuerySchema.parse(request.query);

      const pdfBuffer = await generateYearlyReport(userId, query.year);

      return reply
        .header('Content-Type', 'application/pdf')
        .header(
          'Content-Disposition',
          `attachment; filename="informe-anual-${query.year}.pdf"`,
        )
        .header('Content-Length', pdfBuffer.length)
        .send(pdfBuffer);
    },
  );

  // GET /reports/export?format=csv&from=...&to=...&accountId=...&categoryId=...&type=...
  fastify.get(
    '/reports/export',
    {
      preHandler: requireAuth,
      config: { rateLimit: REPORT_RATE_LIMIT },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const query = ExportQuerySchema.parse(request.query);

      const csv = await exportTransactionsCsv(userId, {
        from: query.from,
        to: query.to,
        accountId: query.accountId,
        categoryId: query.categoryId,
        type: query.type,
      } as any);

      const now = new Date();
      const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="transacciones-${dateTag}.csv"`,
        )
        .send(csv);
    },
  );
}
