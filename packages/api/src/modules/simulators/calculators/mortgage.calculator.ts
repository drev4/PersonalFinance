// ---- Types ------------------------------------------------------------------

export interface MortgageInputs {
  principal: number;      // céntimos
  annualRate: number;     // % anual, ej: 3.5
  years: number;
  fixedYears?: number;    // para hipoteca mixta
  variableRate?: number;  // % para el tramo variable
}

export interface AmortizationRow {
  month: number;
  payment: number;    // céntimos
  interest: number;   // céntimos
  principal: number;  // céntimos
  balance: number;    // capital pendiente, céntimos
}

export interface MortgageResult {
  monthlyPayment: number;        // céntimos
  totalPayment: number;          // céntimos
  totalInterest: number;         // céntimos
  effectiveRate: number;         // TAE aproximada
  schedule: AmortizationRow[];
  fixedPhasePayment?: number;
  variablePhasePayment?: number;
}

// ---- Internal helpers -------------------------------------------------------

/**
 * Computes the French-system monthly payment (cuota constante).
 * All monetary values are in cents (integers).
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
 * Builds a full amortization schedule for the French system.
 * The last payment absorbs any rounding residual so the final balance is 0.
 */
function buildSchedule(
  principalCents: number,
  annualRate: number,
  months: number,
  monthOffset: number = 0,
): AmortizationRow[] {
  const payment = frenchPayment(principalCents, annualRate, months);
  const i = annualRate === 0 ? 0 : annualRate / 12 / 100;
  const rows: AmortizationRow[] = [];
  let balance = principalCents;

  for (let m = 1; m <= months; m++) {
    const interestCents = Math.round(balance * i);
    let principalPart = payment - interestCents;
    let actualPayment = payment;

    // Last row: absorb residual so balance lands exactly at 0
    if (m === months) {
      principalPart = balance;
      actualPayment = balance + interestCents;
    }

    balance -= principalPart;

    rows.push({
      month: monthOffset + m,
      payment: actualPayment,
      interest: interestCents,
      principal: principalPart,
      balance: Math.max(0, balance),
    });
  }

  return rows;
}

/**
 * Approximate TAE (Effective Annual Rate) for a standard mortgage.
 * TAE ≈ (1 + i)^12 - 1  where i = monthly rate
 */
function approximateTae(annualRate: number): number {
  const i = annualRate / 12 / 100;
  return (Math.pow(1 + i, 12) - 1) * 100;
}

// ---- Public API -------------------------------------------------------------

/**
 * Standard French-system mortgage (cuota constante).
 * All monetary inputs and outputs are in cents.
 */
export function calculateMortgage(inputs: MortgageInputs): MortgageResult {
  const { principal, annualRate, years } = inputs;
  const months = years * 12;
  const monthlyPayment = frenchPayment(principal, annualRate, months);
  const schedule = buildSchedule(principal, annualRate, months);

  const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);
  const totalInterest = totalPayment - principal;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    effectiveRate: approximateTae(annualRate),
    schedule,
  };
}

/**
 * Mixed-rate mortgage: fixed tranche for fixedYears, then variable rate.
 * Returns a unified schedule merging both phases.
 */
export function calculateMixedMortgage(
  inputs: Required<Pick<MortgageInputs, 'principal' | 'annualRate' | 'years' | 'fixedYears' | 'variableRate'>>,
): MortgageResult {
  const { principal, annualRate, years, fixedYears, variableRate } = inputs;

  const totalMonths = years * 12;
  const fixedMonths = fixedYears * 12;
  const variableMonths = totalMonths - fixedMonths;

  // Fixed phase
  const fixedPhasePayment = frenchPayment(principal, annualRate, totalMonths);
  const fixedSchedule = buildSchedule(principal, annualRate, fixedMonths, 0);

  // Remaining principal after fixed phase
  const remainingPrincipal = fixedSchedule[fixedSchedule.length - 1].balance;

  // Variable phase
  const variablePhasePayment = frenchPayment(remainingPrincipal, variableRate, variableMonths);
  const variableSchedule = buildSchedule(remainingPrincipal, variableRate, variableMonths, fixedMonths);

  const schedule = [...fixedSchedule, ...variableSchedule];
  const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);
  const totalInterest = totalPayment - principal;

  // Weighted effective rate approximation
  const weightedRate =
    (annualRate * fixedMonths + variableRate * variableMonths) / totalMonths;

  return {
    monthlyPayment: fixedPhasePayment,  // first payment (fixed phase)
    totalPayment,
    totalInterest,
    effectiveRate: approximateTae(weightedRate),
    schedule,
    fixedPhasePayment,
    variablePhasePayment,
  };
}
