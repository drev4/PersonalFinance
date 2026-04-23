// ---- Types ------------------------------------------------------------------

export type EarlyRepaymentStrategy = 'reduce_quota' | 'reduce_term';

export interface EarlyRepaymentInputs {
  remainingPrincipal: number;  // céntimos
  currentRate: number;         // % anual
  remainingMonths: number;
  extraPayment: number;        // céntimos (pago extra puntual)
  strategy: EarlyRepaymentStrategy;
}

interface ScheduleSummary {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  remainingMonths: number;
}

export interface EarlyRepaymentResult {
  originalSchedule: ScheduleSummary;
  newSchedule: ScheduleSummary;
  savings: {
    interest: number;     // intereses ahorrados, céntimos
    months: number;       // meses ahorrados
    totalPayment: number; // ahorro total
  };
}

// ---- Internal helpers -------------------------------------------------------

/**
 * French-system monthly payment.
 */
function frenchPayment(principalCents: number, annualRate: number, months: number): number {
  if (principalCents <= 0 || months <= 0) return 0;
  if (annualRate === 0) {
    return Math.round(principalCents / months);
  }
  const i = annualRate / 12 / 100;
  const factor = Math.pow(1 + i, months);
  return Math.round(principalCents * (i * factor) / (factor - 1));
}

/**
 * Computes the schedule summary for a given principal, rate, and term.
 */
function computeSummary(
  principalCents: number,
  annualRate: number,
  months: number,
): ScheduleSummary {
  if (principalCents <= 0 || months <= 0) {
    return { monthlyPayment: 0, totalInterest: 0, totalPayment: 0, remainingMonths: 0 };
  }

  const payment = frenchPayment(principalCents, annualRate, months);
  const i = annualRate === 0 ? 0 : annualRate / 12 / 100;
  let balance = principalCents;
  let totalInterest = 0;

  for (let m = 1; m <= months; m++) {
    const interestCents = Math.round(balance * i);

    if (m === months) {
      totalInterest += interestCents;
      balance = 0;
    } else {
      const principalPart = payment - interestCents;
      totalInterest += interestCents;
      balance -= principalPart;
    }
  }

  return {
    monthlyPayment: payment,
    totalInterest,
    totalPayment: principalCents + totalInterest,
    remainingMonths: months,
  };
}

/**
 * Calculates how many months a given monthly payment needs to pay off
 * the remaining principal at the given rate (used for reduce_quota with
 * the original payment kept, hence reduces term).
 *
 * Not used directly in reduce_term (term is calculated by iterating until
 * balance reaches 0 with the original payment).
 */
function monthsToPayOff(
  principalCents: number,
  annualRate: number,
  monthlyPayment: number,
): number {
  if (annualRate === 0) {
    return Math.ceil(principalCents / monthlyPayment);
  }
  const i = annualRate / 12 / 100;
  if (monthlyPayment <= principalCents * i) {
    // Payment doesn't cover interest — never paid off
    return Infinity;
  }
  const n = -Math.log(1 - (principalCents * i) / monthlyPayment) / Math.log(1 + i);
  return Math.ceil(n);
}

// ---- Public API -------------------------------------------------------------

/**
 * Calculates the effect of making an early lump-sum payment on a mortgage/loan.
 *
 * - reduce_term:  same monthly payment, fewer months remaining.
 * - reduce_quota: same term, lower monthly payment.
 */
export function calculateEarlyRepayment(inputs: EarlyRepaymentInputs): EarlyRepaymentResult {
  const {
    remainingPrincipal,
    currentRate,
    remainingMonths,
    extraPayment,
    strategy,
  } = inputs;

  // Original schedule (before the extra payment)
  const originalSummary = computeSummary(remainingPrincipal, currentRate, remainingMonths);

  // Principal after extra payment
  const newPrincipal = Math.max(0, remainingPrincipal - extraPayment);

  let newSummary: ScheduleSummary;

  if (strategy === 'reduce_term') {
    // Keep the same monthly payment, calculate how many months needed
    const newMonths = monthsToPayOff(newPrincipal, currentRate, originalSummary.monthlyPayment);
    const actualMonths = Math.min(newMonths, remainingMonths);
    newSummary = computeSummary(newPrincipal, currentRate, actualMonths);
    // Keep the original monthly payment (the schedule rebuilds it the same)
    newSummary = { ...newSummary, monthlyPayment: originalSummary.monthlyPayment };
  } else {
    // reduce_quota: same remaining months, lower payment
    newSummary = computeSummary(newPrincipal, currentRate, remainingMonths);
  }

  const interestSavings = originalSummary.totalInterest - newSummary.totalInterest;
  const monthsSaved = originalSummary.remainingMonths - newSummary.remainingMonths;
  const totalPaymentSavings = originalSummary.totalPayment - (newSummary.totalPayment + extraPayment);

  return {
    originalSchedule: originalSummary,
    newSchedule: newSummary,
    savings: {
      interest: Math.max(0, interestSavings),
      months: Math.max(0, monthsSaved),
      totalPayment: totalPaymentSavings,
    },
  };
}
