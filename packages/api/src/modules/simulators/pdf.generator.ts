import PDFDocument from 'pdfkit';
import type { ISimulation } from './simulation.model.js';
import type { MortgageResult, AmortizationRow } from './calculators/mortgage.calculator.js';
import type { LoanResult } from './calculators/loan.calculator.js';
import type { InvestmentResult, YearlyProjection } from './calculators/investment.calculator.js';
import type { RetirementResult } from './calculators/retirement.calculator.js';
import type { EarlyRepaymentResult } from './calculators/earlyRepayment.calculator.js';

// ---- Formatting helpers -----------------------------------------------------

function euros(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pct(value: number): string {
  return `${value.toFixed(4)}%`;
}

// ---- Layout constants -------------------------------------------------------

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PRIMARY_COLOR = '#1a56db';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#f3f4f6';
const ROW_HEIGHT = 18;
const TABLE_FONT_SIZE = 8;
const BODY_FONT_SIZE = 10;
const TITLE_FONT_SIZE = 20;
const SUBTITLE_FONT_SIZE = 13;

// ---- Shared page layout helpers ---------------------------------------------

function addHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .rect(0, 0, PAGE_WIDTH, 60)
    .fill(PRIMARY_COLOR);

  doc
    .fillColor('#ffffff')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('Finanzas App', MARGIN, 18)
    .fontSize(10)
    .font('Helvetica')
    .text(title, MARGIN, 38);

  doc.fillColor('#000000');
}

function addFooter(doc: PDFKit.PDFDocument): void {
  const y = doc.page.height - 40;
  doc
    .fontSize(7)
    .fillColor(GRAY)
    .font('Helvetica')
    .text(
      `Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}  |  Solo informativo. No constituye asesoramiento financiero.`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH, align: 'center' },
    );
  doc.fillColor('#000000');
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string): void {
  doc
    .moveDown(0.6)
    .fontSize(SUBTITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .fillColor(PRIMARY_COLOR)
    .text(text)
    .moveDown(0.2)
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
    .strokeColor(PRIMARY_COLOR)
    .stroke()
    .moveDown(0.3)
    .fillColor('#000000')
    .fontSize(BODY_FONT_SIZE)
    .font('Helvetica');
}

function keyValue(doc: PDFKit.PDFDocument, label: string, value: string, x?: number): void {
  const xPos = x ?? MARGIN;
  doc
    .font('Helvetica-Bold')
    .fontSize(BODY_FONT_SIZE)
    .text(`${label}: `, xPos, doc.y, { continued: true, lineBreak: false })
    .font('Helvetica')
    .text(value)
    .moveDown(0.15);
}

// ---- Amortization table -----------------------------------------------------

function amortizationTable(
  doc: PDFKit.PDFDocument,
  rows: AmortizationRow[],
): void {
  const headers = ['Mes', 'Cuota', 'Interés', 'Capital', 'Pendiente'];
  const colWidths = [40, 90, 90, 90, 100];
  const colX: number[] = [];
  let cx = MARGIN;
  for (const w of colWidths) {
    colX.push(cx);
    cx += w;
  }

  function drawTableRow(
    items: string[],
    y: number,
    isHeader: boolean,
  ): void {
    if (isHeader) {
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(PRIMARY_COLOR);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(TABLE_FONT_SIZE);
    } else {
      doc.fillColor('#000000').font('Helvetica').fontSize(TABLE_FONT_SIZE);
    }

    for (let i = 0; i < items.length; i++) {
      doc.text(items[i], colX[i] + 3, y, { width: colWidths[i] - 6, align: i === 0 ? 'center' : 'right' });
    }
    if (!isHeader) doc.fillColor('#000000');
  }

  let y = doc.y + 4;
  drawTableRow(headers, y, true);
  doc.fillColor('#000000');
  y += ROW_HEIGHT;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    // Shade alternating rows
    if (idx % 2 === 1) {
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(LIGHT_GRAY);
    }
    drawTableRow(
      [
        String(row.month),
        euros(row.payment),
        euros(row.interest),
        euros(row.principal),
        euros(row.balance),
      ],
      y,
      false,
    );
    y += ROW_HEIGHT;

    // New page if needed
    if (y > doc.page.height - 80) {
      addFooter(doc);
      doc.addPage();
      addHeader(doc, 'Tabla de amortización (continuación)');
      y = 80;
      drawTableRow(headers, y, true);
      doc.fillColor('#000000');
      y += ROW_HEIGHT;
    }
  }

  doc.y = y + 6;
}

// ---- Yearly projection table ------------------------------------------------

function projectionTable(doc: PDFKit.PDFDocument, rows: YearlyProjection[]): void {
  const hasReal = rows.some((r) => r.realValue !== undefined);
  const headers = hasReal
    ? ['Año', 'Aportado', 'Rendimiento', 'Total', 'Valor Real']
    : ['Año', 'Aportado', 'Rendimiento', 'Total'];
  const colWidths = hasReal ? [35, 100, 100, 100, 100] : [35, 120, 120, 120];
  const colX: number[] = [];
  let cx = MARGIN;
  for (const w of colWidths) {
    colX.push(cx);
    cx += w;
  }

  function drawRow(items: string[], y: number, isHeader: boolean): void {
    if (isHeader) {
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(PRIMARY_COLOR);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(TABLE_FONT_SIZE);
    } else {
      doc.fillColor('#000000').font('Helvetica').fontSize(TABLE_FONT_SIZE);
    }
    for (let i = 0; i < items.length; i++) {
      doc.text(items[i], colX[i] + 3, y, { width: colWidths[i] - 6, align: i === 0 ? 'center' : 'right' });
    }
    if (!isHeader) doc.fillColor('#000000');
  }

  let y = doc.y + 4;
  drawRow(headers, y, true);
  doc.fillColor('#000000');
  y += ROW_HEIGHT;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (idx % 2 === 1) {
      doc.rect(MARGIN, y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(LIGHT_GRAY);
    }
    const cells = [
      String(row.year),
      euros(row.contributed),
      euros(row.returns),
      euros(row.total),
    ];
    if (hasReal) cells.push(row.realValue !== undefined ? euros(row.realValue) : '-');

    drawRow(cells, y, false);
    y += ROW_HEIGHT;

    if (y > doc.page.height - 80) {
      addFooter(doc);
      doc.addPage();
      addHeader(doc, 'Proyección anual (continuación)');
      y = 80;
      drawRow(headers, y, true);
      doc.fillColor('#000000');
      y += ROW_HEIGHT;
    }
  }

  doc.y = y + 6;
}

// ---- Per-type generators ----------------------------------------------------

function generateMortgagePdf(
  doc: PDFKit.PDFDocument,
  simulation: ISimulation,
): void {
  const results = simulation.results as unknown as MortgageResult;
  const inputs = simulation.inputs as Record<string, unknown>;

  addHeader(doc, 'Simulación de Hipoteca');
  doc.y = 75;

  doc
    .fontSize(TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text(simulation.name, MARGIN, doc.y)
    .moveDown(0.4);

  sectionTitle(doc, 'Datos de la simulación');
  keyValue(doc, 'Capital prestado', euros(inputs['principal'] as number));
  keyValue(doc, 'Tipo de interés anual', `${inputs['annualRate']}%`);
  keyValue(doc, 'Plazo', `${inputs['years']} años`);
  if (inputs['fixedYears'] !== undefined) {
    keyValue(doc, 'Tramo fijo', `${inputs['fixedYears']} años`);
    keyValue(doc, 'Tipo variable', `${inputs['variableRate']}%`);
  }

  sectionTitle(doc, 'Resultados principales');
  keyValue(doc, 'Cuota mensual', euros(results.monthlyPayment));
  if (results.fixedPhasePayment !== undefined) {
    keyValue(doc, 'Cuota fase fija', euros(results.fixedPhasePayment));
    keyValue(doc, 'Cuota fase variable', euros(results.variablePhasePayment ?? 0));
  }
  keyValue(doc, 'Total pagado', euros(results.totalPayment));
  keyValue(doc, 'Total intereses', euros(results.totalInterest));
  keyValue(doc, 'TAE aproximada', pct(results.effectiveRate));

  sectionTitle(doc, 'Tabla de amortización (primeras 24 + última cuota)');

  const schedule = results.schedule;
  const displayRows: AmortizationRow[] = [
    ...schedule.slice(0, 24),
    ...(schedule.length > 24 ? [schedule[schedule.length - 1]] : []),
  ];

  amortizationTable(doc, displayRows);
}

function generateLoanPdf(
  doc: PDFKit.PDFDocument,
  simulation: ISimulation,
): void {
  const results = simulation.results as unknown as LoanResult;
  const inputs = simulation.inputs as Record<string, unknown>;

  addHeader(doc, 'Simulación de Préstamo');
  doc.y = 75;

  doc
    .fontSize(TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text(simulation.name, MARGIN, doc.y)
    .moveDown(0.4);

  sectionTitle(doc, 'Datos de la simulación');
  keyValue(doc, 'Capital solicitado', euros(inputs['principal'] as number));
  keyValue(doc, 'TIN', `${inputs['annualRate']}%`);
  keyValue(doc, 'Plazo', `${inputs['months']} meses`);
  if ((inputs['openingFee'] as number) > 0) {
    keyValue(doc, 'Comisión apertura', euros(inputs['openingFee'] as number));
  }

  sectionTitle(doc, 'Resultados principales');
  keyValue(doc, 'Cuota mensual', euros(results.monthlyPayment));
  keyValue(doc, 'Total pagado', euros(results.totalPayment));
  keyValue(doc, 'Total intereses', euros(results.totalInterest));
  keyValue(doc, 'TIN', pct(results.tin));
  keyValue(doc, 'TAE', pct(results.tae));

  sectionTitle(doc, 'Tabla de amortización (primeras 24 + última cuota)');

  const schedule = results.schedule;
  const displayRows: AmortizationRow[] = [
    ...schedule.slice(0, 24),
    ...(schedule.length > 24 ? [schedule[schedule.length - 1]] : []),
  ];

  amortizationTable(doc, displayRows);
}

function generateInvestmentPdf(
  doc: PDFKit.PDFDocument,
  simulation: ISimulation,
): void {
  const results = simulation.results as unknown as InvestmentResult;
  const inputs = simulation.inputs as Record<string, unknown>;

  addHeader(doc, 'Simulación de Inversión');
  doc.y = 75;

  doc
    .fontSize(TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text(simulation.name, MARGIN, doc.y)
    .moveDown(0.4);

  sectionTitle(doc, 'Datos de la simulación');
  keyValue(doc, 'Capital inicial', euros(inputs['initialAmount'] as number));
  keyValue(doc, 'Aportación mensual', euros(inputs['monthlyContribution'] as number));
  keyValue(doc, 'Rentabilidad anual', `${inputs['annualReturn']}%`);
  keyValue(doc, 'Plazo', `${inputs['years']} años`);
  if (inputs['inflationRate'] !== undefined) {
    keyValue(doc, 'Inflación estimada', `${inputs['inflationRate']}%`);
  }

  sectionTitle(doc, 'Resultados principales');
  keyValue(doc, 'Valor final', euros(results.finalValue));
  keyValue(doc, 'Total aportado', euros(results.totalContributed));
  keyValue(doc, 'Rendimientos generados', euros(results.totalReturns));
  if (results.realFinalValue !== undefined) {
    keyValue(doc, 'Valor real (ajustado inflación)', euros(results.realFinalValue));
  }

  sectionTitle(doc, 'Proyección anual');
  projectionTable(doc, results.annualProjection);

  if (results.scenarios !== null) {
    sectionTitle(doc, 'Escenarios');
    doc
      .fontSize(BODY_FONT_SIZE)
      .font('Helvetica');

    const sc = results.scenarios;
    const scenarioData = [
      ['Conservador', euros(sc.conservative.finalValue), euros(sc.conservative.totalReturns)],
      ['Base', euros(sc.base.finalValue), euros(sc.base.totalReturns)],
      ['Optimista', euros(sc.optimistic.finalValue), euros(sc.optimistic.totalReturns)],
    ];

    const colWidths = [100, 150, 150];
    const colX: number[] = [MARGIN, MARGIN + 100, MARGIN + 250];

    // Header
    doc.rect(MARGIN, doc.y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(PRIMARY_COLOR);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(TABLE_FONT_SIZE);
    ['Escenario', 'Valor Final', 'Rendimientos'].forEach((h, i) => {
      doc.text(h, colX[i] + 3, doc.y, { width: colWidths[i] - 6, continued: i < 2, lineBreak: i === 2 });
    });
    doc.fillColor('#000000');

    for (const [idx, row] of scenarioData.entries()) {
      const y = doc.y;
      if (idx % 2 === 1) {
        doc.rect(MARGIN, y - 3, CONTENT_WIDTH, ROW_HEIGHT).fill(LIGHT_GRAY);
      }
      doc.font('Helvetica').fontSize(TABLE_FONT_SIZE).fillColor('#000000');
      row.forEach((cell, i) => {
        doc.text(cell, colX[i] + 3, doc.y, { width: colWidths[i] - 6, continued: i < 2, lineBreak: i === 2 });
      });
    }
    doc.moveDown(0.5);
  }
}

function generateRetirementPdf(
  doc: PDFKit.PDFDocument,
  simulation: ISimulation,
): void {
  const results = simulation.results as unknown as RetirementResult;
  const inputs = simulation.inputs as Record<string, unknown>;

  addHeader(doc, 'Simulación de Jubilación');
  doc.y = 75;

  doc
    .fontSize(TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text(simulation.name, MARGIN, doc.y)
    .moveDown(0.4);

  sectionTitle(doc, 'Datos de la simulación');
  keyValue(doc, 'Edad actual', `${inputs['currentAge']} años`);
  keyValue(doc, 'Edad de jubilación', `${inputs['retirementAge']} años`);
  keyValue(doc, 'Renta mensual objetivo', euros(inputs['targetMonthlyIncome'] as number));
  keyValue(doc, 'Ahorros actuales', euros(inputs['currentSavings'] as number));
  keyValue(doc, 'Rentabilidad esperada', `${inputs['expectedReturn']}%`);
  keyValue(doc, 'Inflación estimada', `${inputs['inflationRate']}%`);
  keyValue(doc, 'Esperanza de vida', `${inputs['lifeExpectancy']} años`);

  sectionTitle(doc, 'Resultados principales');
  keyValue(doc, 'Capital necesario', euros(results.requiredNestEgg));
  keyValue(doc, 'Aportación mensual necesaria', euros(results.monthlySavingsNeeded));
  keyValue(doc, 'Años para jubilarse', `${results.yearsToRetirement}`);
  keyValue(doc, 'Proyección sin aportar más', euros(results.projectedNestEgg));
  keyValue(doc, 'Déficit', euros(results.shortfall));

  sectionTitle(doc, 'Proyección anual de acumulación');
  projectionTable(doc, results.annualProjection);
}

function generateEarlyRepaymentPdf(
  doc: PDFKit.PDFDocument,
  simulation: ISimulation,
): void {
  const results = simulation.results as unknown as EarlyRepaymentResult;
  const inputs = simulation.inputs as Record<string, unknown>;

  addHeader(doc, 'Simulación de Amortización Anticipada');
  doc.y = 75;

  doc
    .fontSize(TITLE_FONT_SIZE)
    .font('Helvetica-Bold')
    .text(simulation.name, MARGIN, doc.y)
    .moveDown(0.4);

  sectionTitle(doc, 'Datos de la simulación');
  keyValue(doc, 'Capital pendiente', euros(inputs['remainingPrincipal'] as number));
  keyValue(doc, 'Tipo de interés', `${inputs['currentRate']}%`);
  keyValue(doc, 'Meses restantes', `${inputs['remainingMonths']}`);
  keyValue(doc, 'Pago extra', euros(inputs['extraPayment'] as number));
  keyValue(doc, 'Estrategia', inputs['strategy'] === 'reduce_quota' ? 'Reducir cuota' : 'Reducir plazo');

  sectionTitle(doc, 'Plan original');
  keyValue(doc, 'Cuota mensual', euros(results.originalSchedule.monthlyPayment));
  keyValue(doc, 'Total intereses', euros(results.originalSchedule.totalInterest));
  keyValue(doc, 'Total a pagar', euros(results.originalSchedule.totalPayment));
  keyValue(doc, 'Meses restantes', `${results.originalSchedule.remainingMonths}`);

  sectionTitle(doc, 'Nuevo plan (tras amortización)');
  keyValue(doc, 'Cuota mensual', euros(results.newSchedule.monthlyPayment));
  keyValue(doc, 'Total intereses', euros(results.newSchedule.totalInterest));
  keyValue(doc, 'Total a pagar', euros(results.newSchedule.totalPayment));
  keyValue(doc, 'Meses restantes', `${results.newSchedule.remainingMonths}`);

  sectionTitle(doc, 'Ahorro generado');
  keyValue(doc, 'Intereses ahorrados', euros(results.savings.interest));
  keyValue(doc, 'Meses ahorrados', `${results.savings.months}`);
  keyValue(doc, 'Ahorro total', euros(results.savings.totalPayment));
}

// ---- Main export ------------------------------------------------------------

export async function generateSimulationPdf(simulation: ISimulation): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: simulation.name,
        Author: 'Finanzas App',
        Subject: `Simulación ${simulation.type}`,
        Keywords: 'finanzas simulacion',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    switch (simulation.type) {
      case 'mortgage':
        generateMortgagePdf(doc, simulation);
        break;
      case 'loan':
        generateLoanPdf(doc, simulation);
        break;
      case 'investment':
        generateInvestmentPdf(doc, simulation);
        break;
      case 'retirement':
        generateRetirementPdf(doc, simulation);
        break;
      case 'early_repayment':
        generateEarlyRepaymentPdf(doc, simulation);
        break;
    }

    addFooter(doc);
    doc.end();
  });
}
