import type { AmortizationRow } from './mortgage.calculator.js';

// ---- Types ------------------------------------------------------------------

export interface LoanInputs {
  principal: number;      // céntimos
  annualRate: number;     // TIN %
  months: number;
  openingFee?: number;    // céntimos (comisión de apertura)
  otherFees?: number;     // céntimos (otros gastos)
}

export interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  tin: number;
  tae: number;            // calculada incluyendo comisiones
  schedule: AmortizationRow[];
}

// ---- Internal helpers -------------------------------------------------------

/**
 * French-system monthly payment.
 * i = annualRate / 12 / 100
 * cuota = principal * (i * (1+i)^n) / ((1+i)^n - 1)
 */
function frenchPayment(principalCents: number, annualRate: number, months: number): number {
  if (annualRate === 0) {
    return Math.round(principalCents / months);
  }
  const i = annualRate / 12 / 100;
  const factor = Math.pow(1 + i, months);
  return Math.round(principalCents * (i * factor) / (factor - 1));
}

/**
 * Builds a full amortization schedule.
 * The last payment absorbs rounding residual.
 */
function buildSchedule(
  principalCents: number,
  annualRate: number,
  months: number,
): AmortizationRow[] {
  const payment = frenchPayment(principalCents, annualRate, months);
  const i = annualRate === 0 ? 0 : annualRate / 12 / 100;
  const rows: AmortizationRow[] = [];
  let balance = principalCents;

  for (let m = 1; m <= months; m++) {
    const interestCents = Math.round(balance * i);
    let principalPart = payment - interestCents;
    let actualPayment = payment;

    if (m === months) {
      principalPart = balance;
      actualPayment = balance + interestCents;
    }

    balance -= principalPart;

    rows.push({
      month: m,
      payment: actualPayment,
      interest: interestCents,
      principal: principalPart,
      balance: Math.max(0, balance),
    });
  }

  return rows;
}

/**
 * Calculates the True Annual Rate (TAE) using Newton-Raphson.
 *
 * The TAE solves for r (monthly) in:
 *   (principal - fees) = sum_{k=1}^{n} payment / (1 + r)^k
 *
 * Then TAE = (1 + r)^12 - 1
 *
 * @param netPrincipal  principal minus all upfront fees, in cents
 * @param payment       monthly payment in cents
 * @param months        loan term in months
 */
function newtonRaphsonTae(
  netPrincipal: number,
  payment: number,
  months: number,
): number {
  // Initial guess: TIN monthly rate
  let r = payment / netPrincipal / months;
  const MAX_ITER = 200;
  const TOLERANCE = 1e-10;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // f(r) = netPrincipal - payment * (1 - (1+r)^-n) / r
    // f'(r) = payment * [((1+r)^-n * n) / r - (1 - (1+r)^-n) / r^2]
    const onePlusR = 1 + r;
    const onePlusRPowN = Math.pow(onePlusR, months);
    const annuityFactor = (1 - 1 / onePlusRPowN) / r;

    const f = netPrincipal - payment * annuityFactor;

    // Derivative
    const dAnnuity =
      (months / (onePlusR * onePlusRPowN * r)) - annuityFactor / r;
    const fp = -payment * dAnnuity;

    const delta = f / fp;
    r -= delta;

    if (Math.abs(delta) < TOLERANCE) break;
  }

  // Convert monthly rate to annual TAE
  const tae = (Math.pow(1 + r, 12) - 1) * 100;
  return Math.round(tae * 10000) / 10000; // 4 decimal places
}

// ---- Public API -------------------------------------------------------------

/**
 * Calculates a French-system personal loan.
 * TAE includes opening fee and other fees.
 */
export function calculateLoan(inputs: LoanInputs): LoanResult {
  const {
    principal,
    annualRate,
    months,
    openingFee = 0,
    otherFees = 0,
  } = inputs;

  const schedule = buildSchedule(principal, annualRate, months);
  const monthlyPayment = schedule[0].payment;
  const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);
  const totalInterest = totalPayment - principal;

  const tin = annualRate;

  // TAE: net principal received by borrower is principal minus fees
  const totalFees = openingFee + otherFees;
  let tae: number;

  if (totalFees === 0) {
    // Without fees TAE ≈ (1 + i)^12 - 1
    if (annualRate === 0) {
      tae = 0;
    } else {
      const i = annualRate / 12 / 100;
      tae = Math.round((Math.pow(1 + i, 12) - 1) * 100 * 10000) / 10000;
    }
  } else {
    const netPrincipal = principal - totalFees;
    tae = newtonRaphsonTae(netPrincipal, monthlyPayment, months);
  }

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    tin,
    tae,
    schedule,
  };
}
