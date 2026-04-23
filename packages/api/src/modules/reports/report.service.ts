import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import { TransactionModel } from '../transactions/transaction.model.js';
import { CategoryModel } from '../categories/category.model.js';
import { UserModel } from '../users/user.model.js';
import type { TransactionFilters } from '../transactions/transaction.repository.js';
import { getNetWorth } from '../dashboard/dashboard.service.js';
import { getPortfolioSummary } from '../holdings/holding.service.js';
import { getBudgetProgress } from '../budgets/budget.service.js';
import { findByUser as findBudgetsByUser } from '../budgets/budget.repository.js';

// ---- Layout constants -------------------------------------------------------

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Brand colours
const DARK_BLUE = '#1e3a5f';
const GREEN = '#2e7d32';
const RED = '#c62828';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#f3f4f6';
const WHITE = '#ffffff';

const ROW_HEIGHT = 18;
const TABLE_FONT_SIZE = 8;
const BODY_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 22;
const SUBTITLE_FONT_SIZE = 13;

// ---- Formatting helpers ----------------------------------------------------

function eurosCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_ES[month - 1]} ${year}`;
}

/** Draws the coloured page header bar. */
function addPageHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .rect(0, 0, PAGE_WIDTH, 58)
    .fill(DARK_BLUE);

  doc
    .fillColor(WHITE)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Finanzas App', MARGIN, 14)
    .fontSize(9)
    .font('Helvetica')
    .text(title, MARGIN, 36);

  doc.fillColor('#000000');
}

/** Draws a small footer on the current page. */
function addPageFooter(doc: PDFKit.PDFDocument): void {
  const y = doc.page.height - 36;
  doc
    .fontSize(7)
    .fillColor(GRAY)
    .font('Helvetica')
    .text(
      `Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}  |  Este informe es meramente informativo y no constituye asesoramiento financiero.`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH, align: 'center' },
    );
  doc.fillColor('#000000');
}

/** Draws a section heading with a ruled underline. */
function sectionTitle(doc: PDFKit.PDFDocument, text: string): void {
  doc
    .moveDown(0.8)
    .fontSize(SUBTITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .fillColor(DARK_BLUE)
    .text(text)
    .moveDown(0.15)
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
    .strokeColor(DARK_BLUE)
    .stroke()
    .moveDown(0.4)
    .fillColor('#000000')
    .fontSize(BODY_FONT_SIZE)
    .font('Helvetica');
}

/** Labelled key-value pair. */
function kv(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  valueColor?: string,
): void {
  doc
    .font('Helvetica-Bold')
    .fontSize(BODY_FONT_SIZE)
    .fillColor('#000000')
    .text(`${label}: `, { continued: true, lineBreak: false })
    .font('Helvetica')
    .fillColor(valueColor ?? '#000000')
    .text(value)
    .fillColor('#000000')
    .moveDown(0.2);
}

/** Renders a simple horizontal ASCII progress bar (30 chars wide). */
function asciiBar(percentage: number): string {
  const clamped = Math.min(100, Math.max(0, percentage));
  const filled = Math.round((clamped / 100) * 20);
  return `[${'█'.repeat(filled)}${'░'.repeat(20 - filled)}] ${clamped.toFixed(1)}%`;
}

/** Generic table renderer. Returns the new y position after drawing. */
function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  colWidths: number[],
  rows: string[][],
  headerTitle: string,
): void {
  const colX: number[] = [];
  let cx = MARGIN;
  for (const w of colWidths) {
    colX.push(cx);
    cx += w;
  }

  function drawRow(cells: string[], y: number, isHeader: boolean): void {
    if (isHeader) {
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(DARK_BLUE);
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(TABLE_FONT_SIZE);
    } else {
      doc.fillColor('#000000').font('Helvetica').fontSize(TABLE_FONT_SIZE);
    }

    for (let i = 0; i < cells.length; i++) {
      doc.text(
        cells[i],
        colX[i] + 3,
        y,
        { width: colWidths[i] - 6, align: i === 0 ? 'left' : 'right' },
      );
    }
    if (!isHeader) doc.fillColor('#000000');
  }

  let y = doc.y + 4;

  drawRow(headers, y, true);
  doc.fillColor('#000000');
  y += ROW_HEIGHT;

  for (let idx = 0; idx < rows.length; idx++) {
    if (y > doc.page.height - 80) {
      addPageFooter(doc);
      doc.addPage();
      addPageHeader(doc, headerTitle);
      y = 70;
      drawRow(headers, y, true);
      doc.fillColor('#000000');
      y += ROW_HEIGHT;
    }

    if (idx % 2 === 1) {
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(LIGHT_GRAY);
    }
    drawRow(rows[idx], y, false);
    y += ROW_HEIGHT;
  }

  doc.y = y + 8;
}

// ---- Monthly period helpers -------------------------------------------------

function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function prevMonthRange(year: number, month: number): { start: Date; end: Date } {
  const d = new Date(year, month - 2, 1); // month - 2 because months are 0-indexed
  return monthRange(d.getFullYear(), d.getMonth() + 1);
}

// ---- Weekly cashflow buckets for a month -----------------------------------

interface WeekBucket {
  label: string;
  income: number;
  expenses: number;
}

function buildWeekBuckets(
  transactions: Array<{ date: Date; type: string; amount: number }>,
  year: number,
  month: number,
): WeekBucket[] {
  const { start } = monthRange(year, month);
  const buckets: WeekBucket[] = [
    { label: 'Semana 1', income: 0, expenses: 0 },
    { label: 'Semana 2', income: 0, expenses: 0 },
    { label: 'Semana 3', income: 0, expenses: 0 },
    { label: 'Semana 4+', income: 0, expenses: 0 },
  ];

  for (const tx of transactions) {
    const dayOfMonth = tx.date.getDate();
    const weekIdx = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
    if (tx.type === 'income') {
      buckets[weekIdx].income += tx.amount;
    } else if (tx.type === 'expense') {
      buckets[weekIdx].expenses += tx.amount;
    }
  }

  return buckets;
}

// ---- PDF builder helpers ----------------------------------------------------

/**
 * Builds a complete PDF document from the provided data and resolves with its Buffer.
 */
function buildPdf(
  render: (doc: PDFKit.PDFDocument) => void,
  title: string,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: title,
        Author: 'Finanzas App',
        Subject: title,
        Keywords: 'finanzas informe personal',
      },
      autoFirstPage: false,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    render(doc);

    addPageFooter(doc);
    doc.end();
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates a monthly PDF report for the given user, year and month (1-12).
 */
export async function generateMonthlyReport(
  userId: string,
  year: number,
  month: number,
): Promise<Buffer> {
  const { start, end } = monthRange(year, month);
  const { start: prevStart, end: prevEnd } = prevMonthRange(year, month);

  // ---- Fetch all required data in parallel ----------------------------------
  const [user, transactions, netWorthNow, portfolioSummary, budgets] =
    await Promise.all([
      UserModel.findById(userId).select('name').lean().exec(),
      TransactionModel.find({
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end },
        type: { $in: ['income', 'expense'] },
      })
        .sort({ amount: -1 })
        .lean()
        .exec(),
      getNetWorth(userId),
      getPortfolioSummary(userId).catch(() => null),
      findBudgetsByUser(userId),
    ]);

  // Previous month net worth (from snapshot, best-effort)
  const prevMonthTransactions = await TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: prevStart, $lte: prevEnd },
    type: { $in: ['income', 'expense'] },
  })
    .lean()
    .exec();

  // Monthly income / expenses (current month)
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of transactions) {
    if (tx.type === 'income') totalIncome += tx.amount;
    else if (tx.type === 'expense') totalExpenses += tx.amount;
  }

  // Previous month income / expenses
  let prevIncome = 0;
  let prevExpenses = 0;
  for (const tx of prevMonthTransactions) {
    if (tx.type === 'income') prevIncome += tx.amount;
    else if (tx.type === 'expense') prevExpenses += tx.amount;
  }

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
  const prevBalance = prevIncome - prevExpenses;
  const netWorthVariation = netWorthNow.total - (netWorthNow.total - balance + prevBalance);

  // Spending by category
  const expenseTxs = transactions.filter((tx) => tx.type === 'expense');
  const catSpendMap = new Map<string, number>();
  for (const tx of expenseTxs) {
    if (tx.categoryId !== undefined && tx.categoryId !== null) {
      const catId = String(tx.categoryId);
      catSpendMap.set(catId, (catSpendMap.get(catId) ?? 0) + tx.amount);
    }
  }

  const categoryIds = [...catSpendMap.keys()].map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  const categories = await CategoryModel.find({ _id: { $in: categoryIds } })
    .select('_id name')
    .lean()
    .exec();
  const catNameMap = new Map(categories.map((c) => [String(c._id), c.name]));

  const catRows = [...catSpendMap.entries()]
    .map(([catId, total]) => ({
      name: catNameMap.get(catId) ?? 'Sin categoría',
      total,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Budget progress for active budgets
  const budgetProgresses = await Promise.all(
    budgets
      .filter((b) => b.isActive)
      .map((b) => getBudgetProgress(userId, b._id.toHexString(), start).catch(() => null)),
  );
  const validBudgets = budgetProgresses.filter((bp) => bp !== null);

  // Top 10 transactions by amount (descending)
  const top10 = [...transactions].sort((a, b) => b.amount - a.amount).slice(0, 10);

  // Weekly cashflow buckets
  const weekBuckets = buildWeekBuckets(transactions, year, month);

  const userName = (user?.name as string | undefined) ?? 'Usuario';
  const reportTitle = `Informe mensual — ${monthLabel(year, month)}`;

  return buildPdf((doc) => {
    // ── Cover page ──────────────────────────────────────────────────────────
    doc.addPage();
    addPageHeader(doc, reportTitle);

    doc
      .moveDown(3)
      .fontSize(TITLE_FONT_SIZE)
      .font('Helvetica-Bold')
      .fillColor(DARK_BLUE)
      .text(reportTitle, MARGIN, doc.y, { align: 'center' })
      .moveDown(0.6)
      .fontSize(BODY_FONT_SIZE)
      .font('Helvetica')
      .fillColor(GRAY)
      .text(`Usuario: ${userName}`, { align: 'center' })
      .text(
        `Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        { align: 'center' },
      )
      .fillColor('#000000');

    // ── Executive summary ────────────────────────────────────────────────────
    sectionTitle(doc, '1. Resumen ejecutivo');

    kv(doc, 'Patrimonio neto actual', eurosCents(netWorthNow.total),
      netWorthNow.total >= 0 ? GREEN : RED);

    const varSign = netWorthVariation >= 0 ? '+' : '';
    kv(doc, 'Variación vs mes anterior', `${varSign}${eurosCents(netWorthVariation)}`,
      netWorthVariation >= 0 ? GREEN : RED);

    kv(doc, 'Ingresos del mes', eurosCents(totalIncome), GREEN);
    kv(doc, 'Gastos del mes', eurosCents(totalExpenses), RED);
    kv(doc, 'Balance (ingresos − gastos)', eurosCents(balance), balance >= 0 ? GREEN : RED);
    kv(doc, 'Tasa de ahorro', `${savingsRate.toFixed(1)}%`,
      savingsRate >= 20 ? GREEN : savingsRate >= 0 ? DARK_BLUE : RED);

    // ── Spending by category ─────────────────────────────────────────────────
    sectionTitle(doc, '2. Gastos por categoría');

    if (catRows.length === 0) {
      doc.fontSize(BODY_FONT_SIZE).font('Helvetica').text('Sin gastos registrados en este período.');
    } else {
      drawTable(
        doc,
        ['Categoría', 'Importe (EUR)', '% Total', 'Progreso'],
        [160, 100, 60, 175],
        catRows.map((r) => [
          r.name,
          eurosCents(r.total),
          `${r.percentage.toFixed(1)}%`,
          asciiBar(r.percentage),
        ]),
        reportTitle,
      );
    }

    // ── Budget comparison ────────────────────────────────────────────────────
    sectionTitle(doc, '3. Comparativa de presupuestos');

    if (validBudgets.length === 0) {
      doc.fontSize(BODY_FONT_SIZE).font('Helvetica').text('Sin presupuestos activos.');
    } else {
      const budgetTableRows: string[][] = [];
      for (const bp of validBudgets) {
        for (const item of bp.items) {
          const statusLabel =
            item.status === 'exceeded'
              ? 'Excedido'
              : item.status === 'warning'
                ? 'Aviso'
                : 'OK';
          budgetTableRows.push([
            `${bp.name} / ${item.categoryName}`,
            eurosCents(item.budgeted),
            eurosCents(item.spent),
            eurosCents(item.remaining),
            statusLabel,
          ]);
        }
      }

      drawTable(
        doc,
        ['Presupuesto / Categoría', 'Presupuestado', 'Gastado', 'Restante', 'Estado'],
        [155, 80, 80, 80, 60],
        budgetTableRows,
        reportTitle,
      );
    }

    // ── Top 10 transactions ───────────────────────────────────────────────────
    sectionTitle(doc, '4. Top 10 transacciones del mes');

    if (top10.length === 0) {
      doc.fontSize(BODY_FONT_SIZE).font('Helvetica').text('Sin transacciones en este período.');
    } else {
      drawTable(
        doc,
        ['Fecha', 'Descripción', 'Tipo', 'Importe (EUR)'],
        [70, 240, 70, 115],
        top10.map((tx) => [
          formatDate(new Date(tx.date)),
          tx.description.slice(0, 40),
          tx.type === 'income' ? 'Ingreso' : 'Gasto',
          eurosCents(tx.amount),
        ]),
        reportTitle,
      );
    }

    // ── Investment summary ────────────────────────────────────────────────────
    sectionTitle(doc, '5. Resumen de inversiones');

    if (portfolioSummary === null || portfolioSummary.totalValue === 0) {
      doc.fontSize(BODY_FONT_SIZE).font('Helvetica').text('Sin inversiones registradas.');
    } else {
      kv(doc, 'Valor portfolio', eurosCents(portfolioSummary.totalValue));
      kv(doc, 'P&L total', eurosCents(portfolioSummary.totalPnl),
        portfolioSummary.totalPnl >= 0 ? GREEN : RED);
      kv(doc, 'P&L %', `${portfolioSummary.totalPnlPercentage.toFixed(2)}%`,
        portfolioSummary.totalPnlPercentage >= 0 ? GREEN : RED);

      if (portfolioSummary.byAssetType.length > 0) {
        doc.moveDown(0.4).font('Helvetica-Bold').fontSize(BODY_FONT_SIZE)
          .text('Distribución por tipo de activo:').font('Helvetica').moveDown(0.2);

        drawTable(
          doc,
          ['Tipo de activo', 'Valor (EUR)', '% Portfolio'],
          [200, 145, 150],
          portfolioSummary.byAssetType.map((a) => [
            a.type,
            eurosCents(a.value),
            `${a.percentage.toFixed(1)}%`,
          ]),
          reportTitle,
        );
      }
    }

    // ── Weekly cashflow ────────────────────────────────────────────────────────
    sectionTitle(doc, '6. Flujo de caja mensual (semanal)');

    drawTable(
      doc,
      ['Semana', 'Ingresos (EUR)', 'Gastos (EUR)', 'Balance (EUR)'],
      [120, 130, 130, 115],
      weekBuckets.map((b) => [
        b.label,
        eurosCents(b.income),
        eurosCents(b.expenses),
        eurosCents(b.income - b.expenses),
      ]),
      reportTitle,
    );

    // ── Legal disclaimer ──────────────────────────────────────────────────────
    doc
      .moveDown(1.5)
      .fontSize(8)
      .fillColor(GRAY)
      .font('Helvetica')
      .text(
        'Nota: Este informe es meramente informativo y no constituye asesoramiento financiero. ' +
        'Los datos aquí reflejados provienen de la información registrada en la aplicación y ' +
        'pueden no reflejar la totalidad de la situación financiera del usuario.',
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH },
      )
      .fillColor('#000000');
  }, reportTitle);
}

/**
 * Generates a yearly PDF report for the given user and year.
 */
export async function generateYearlyReport(
  userId: string,
  year: number,
): Promise<Buffer> {
  const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const [user, allTransactions, netWorthNow, portfolioSummary] = await Promise.all([
    UserModel.findById(userId).select('name').lean().exec(),
    TransactionModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: yearStart, $lte: yearEnd },
      type: { $in: ['income', 'expense'] },
    })
      .lean()
      .exec(),
    getNetWorth(userId),
    getPortfolioSummary(userId).catch(() => null),
  ]);

  // Aggregate by month
  const monthlyData: Array<{
    label: string;
    income: number;
    expenses: number;
    balance: number;
  }> = [];

  for (let m = 1; m <= 12; m++) {
    const { start, end } = monthRange(year, m);
    const monthTxs = allTransactions.filter(
      (tx) => tx.date >= start && tx.date <= end,
    );
    let income = 0;
    let expenses = 0;
    for (const tx of monthTxs) {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expenses += tx.amount;
    }
    monthlyData.push({ label: MONTH_NAMES_ES[m - 1], income, expenses, balance: income - expenses });
  }

  const yearlyIncome = monthlyData.reduce((s, r) => s + r.income, 0);
  const yearlyExpenses = monthlyData.reduce((s, r) => s + r.expenses, 0);
  const yearlyBalance = yearlyIncome - yearlyExpenses;
  const yearlySavingsRate = yearlyIncome > 0 ? (yearlyBalance / yearlyIncome) * 100 : 0;

  const userName = (user?.name as string | undefined) ?? 'Usuario';
  const reportTitle = `Informe anual ${year}`;

  return buildPdf((doc) => {
    // ── Cover page ──────────────────────────────────────────────────────────
    doc.addPage();
    addPageHeader(doc, reportTitle);

    doc
      .moveDown(3)
      .fontSize(TITLE_FONT_SIZE)
      .font('Helvetica-Bold')
      .fillColor(DARK_BLUE)
      .text(reportTitle, MARGIN, doc.y, { align: 'center' })
      .moveDown(0.6)
      .fontSize(BODY_FONT_SIZE)
      .font('Helvetica')
      .fillColor(GRAY)
      .text(`Usuario: ${userName}`, { align: 'center' })
      .text(
        `Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        { align: 'center' },
      )
      .fillColor('#000000');

    // ── Annual summary ────────────────────────────────────────────────────────
    sectionTitle(doc, '1. Resumen anual');

    kv(doc, 'Patrimonio neto actual', eurosCents(netWorthNow.total),
      netWorthNow.total >= 0 ? GREEN : RED);
    kv(doc, 'Total ingresos', eurosCents(yearlyIncome), GREEN);
    kv(doc, 'Total gastos', eurosCents(yearlyExpenses), RED);
    kv(doc, 'Balance anual', eurosCents(yearlyBalance), yearlyBalance >= 0 ? GREEN : RED);
    kv(doc, 'Tasa de ahorro anual', `${yearlySavingsRate.toFixed(1)}%`,
      yearlySavingsRate >= 20 ? GREEN : DARK_BLUE);

    // ── Month-by-month breakdown ──────────────────────────────────────────────
    sectionTitle(doc, '2. Resumen mensual');

    drawTable(
      doc,
      ['Mes', 'Ingresos (EUR)', 'Gastos (EUR)', 'Balance (EUR)'],
      [120, 130, 130, 115],
      monthlyData.map((r) => [
        r.label.charAt(0).toUpperCase() + r.label.slice(1),
        eurosCents(r.income),
        eurosCents(r.expenses),
        eurosCents(r.balance),
      ]),
      reportTitle,
    );

    // ── Investment summary ────────────────────────────────────────────────────
    sectionTitle(doc, '3. Resumen de inversiones');

    if (portfolioSummary === null || portfolioSummary.totalValue === 0) {
      doc.fontSize(BODY_FONT_SIZE).font('Helvetica').text('Sin inversiones registradas.');
    } else {
      kv(doc, 'Valor portfolio', eurosCents(portfolioSummary.totalValue));
      kv(doc, 'P&L total', eurosCents(portfolioSummary.totalPnl),
        portfolioSummary.totalPnl >= 0 ? GREEN : RED);
      kv(doc, 'P&L %', `${portfolioSummary.totalPnlPercentage.toFixed(2)}%`,
        portfolioSummary.totalPnlPercentage >= 0 ? GREEN : RED);

      drawTable(
        doc,
        ['Tipo de activo', 'Valor (EUR)', '% Portfolio'],
        [200, 145, 150],
        portfolioSummary.byAssetType.map((a) => [
          a.type, eurosCents(a.value), `${a.percentage.toFixed(1)}%`,
        ]),
        reportTitle,
      );
    }

    // ── Legal disclaimer ──────────────────────────────────────────────────────
    doc
      .moveDown(1.5)
      .fontSize(8)
      .fillColor(GRAY)
      .font('Helvetica')
      .text(
        'Nota: Este informe es meramente informativo y no constituye asesoramiento financiero.',
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH },
      )
      .fillColor('#000000');
  }, reportTitle);
}

/**
 * Exports transactions as a UTF-8 CSV string (with BOM for Excel compatibility).
 * Amounts are in euros (÷100), dates in DD/MM/YYYY format.
 */
export async function exportTransactionsCsv(
  userId: string,
  filters: TransactionFilters,
): Promise<string> {
  const query: mongoose.FilterQuery<{ userId: unknown; date?: unknown; categoryId?: unknown; accountId?: unknown; type?: unknown }> = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (filters.from !== undefined || filters.to !== undefined) {
    const dateFilter: Record<string, Date> = {};
    if (filters.from !== undefined) dateFilter['$gte'] = filters.from;
    if (filters.to !== undefined) dateFilter['$lte'] = filters.to;
    query['date'] = dateFilter;
  }
  if (filters.categoryId !== undefined) {
    query['categoryId'] = new mongoose.Types.ObjectId(filters.categoryId);
  }
  if (filters.accountId !== undefined) {
    query['accountId'] = new mongoose.Types.ObjectId(filters.accountId);
  }
  if (filters.type !== undefined) {
    query['type'] = filters.type;
  }

  const transactions = await TransactionModel.find(query)
    .sort({ date: -1 })
    .populate('categoryId', 'name')
    .populate('accountId', 'name')
    .lean()
    .exec();

  // Build CSV rows
  const header = 'Fecha,Descripción,Categoría,Cuenta,Tipo,Importe (EUR),Divisa,Tags';

  const escapeField = (value: string): string => {
    // RFC 4180: wrap in quotes if the value contains comma, quote or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const rows = transactions.map((tx) => {
    const date = formatDate(new Date(tx.date));
    const description = escapeField(tx.description);

    // Populated fields arrive as objects or remain as ObjectId
    const categoryDoc = tx.categoryId as unknown as { name?: string } | null;
    const accountDoc = tx.accountId as unknown as { name?: string } | null;

    const category = escapeField(categoryDoc?.name ?? '');
    const account = escapeField(accountDoc?.name ?? '');

    const typeLabel =
      tx.type === 'income'
        ? 'Ingreso'
        : tx.type === 'expense'
          ? 'Gasto'
          : tx.type === 'transfer'
            ? 'Transferencia'
            : 'Ajuste';

    const amount = (tx.amount / 100).toFixed(2);
    const currency = tx.currency;
    const tags = escapeField((tx.tags ?? []).join('; '));

    return [date, description, category, account, typeLabel, amount, currency, tags].join(',');
  });

  // UTF-8 BOM (﻿) for Excel compatibility on Windows
  const bom = '﻿';
  return bom + [header, ...rows].join('\r\n');
}
