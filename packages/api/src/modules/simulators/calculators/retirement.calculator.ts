import type { YearlyProjection } from './investment.calculator.js';

// ---- Types ------------------------------------------------------------------

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;         // default 65
  targetMonthlyIncome: number;   // céntimos/mes en jubilación
  currentSavings: number;        // céntimos ya ahorrados
  expectedReturn: number;        // % anual
  inflationRate: number;         // % anual
  lifeExpectancy: number;        // default 85
}

export interface RetirementResult {
  requiredNestEgg: number;       // capital necesario al jubilarse, céntimos
  monthlySavingsNeeded: number;  // aportación mensual necesaria, céntimos
  yearsToRetirement: number;
  projectedNestEgg: number;      // proyección sin aportar más
  shortfall: number;             // diferencia (0 si ya cubierto)
  annualProjection: YearlyProjection[];
}

// ---- Internal helpers -------------------------------------------------------

/**
 * French-system monthly payment (PMT).
 */
function frenchPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (annualRate === 0) return Math.round(principal / months);
  const i = annualRate / 12 / 100;
  const factor = Math.pow(1 + i, months);
  return Math.round(principal * (i * factor) / (factor - 1));
}

/**
 * Future value of a lump sum.
 */
function fvLumpSum(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12 / 100;
  const months = years * 12;
  return Math.round(principal * Math.pow(1 + monthlyRate, months));
}

/**
 * Future value of a monthly annuity.
 * FV = PMT * ((1+r)^n - 1) / r
 */
function fvAnnuity(monthlySaving: number, annualRate: number, years: number): number {
  const r = annualRate / 12 / 100;
  const n = years * 12;
  if (r === 0) return monthlySaving * n;
  return Math.round(monthlySaving * (Math.pow(1 + r, n) - 1) / r);
}

/**
 * Present value of an annuity (needed nest egg to fund monthly income).
 * Uses real rate of return (adjusted for inflation) during drawdown.
 *
 * PV = PMT * (1 - (1+r)^-n) / r
 */
function pvAnnuity(monthlyIncome: number, realAnnualReturn: number, months: number): number {
  const r = realAnnualReturn / 12 / 100;
  if (r <= 0) {
    // Zero or negative real return: simple multiplication
    return monthlyIncome * months;
  }
  return Math.round(monthlyIncome * (1 - Math.pow(1 + r, -months)) / r);
}

/**
 * Monthly contribution needed to grow from currentSavings to targetNestEgg
 * over n years with a given annual return.
 *
 * targetNestEgg = currentSavings*(1+r)^n + PMT*((1+r)^n - 1)/r
 * PMT = (targetNestEgg - currentSavings*(1+r)^n) * r / ((1+r)^n - 1)
 */
function monthlyContributionNeeded(
  currentSavings: number,
  targetNestEgg: number,
  annualReturn: number,
  years: number,
): number {
  const r = annualReturn / 12 / 100;
  const n = years * 12;
  const fvCurrent = Math.round(currentSavings * Math.pow(1 + r, n));
  const gap = targetNestEgg - fvCurrent;

  if (gap <= 0) return 0;
  if (r === 0) return Math.ceil(gap / n);

  const factor = Math.pow(1 + r, n) - 1;
  return Math.ceil((gap * r) / factor);
}

// ---- Public API -------------------------------------------------------------

/**
 * Calculates how much a person needs to save monthly to retire with
 * a target monthly income, using PV/FV formulas with inflation adjustment.
 */
export function calculateRetirement(inputs: RetirementInputs): RetirementResult {
  const {
    currentAge,
    retirementAge,
    targetMonthlyIncome,
    currentSavings,
    expectedReturn,
    inflationRate,
    lifeExpectancy,
  } = inputs;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge);
  const monthsInRetirement = yearsInRetirement * 12;

  // Real return during drawdown (Fisher equation approximation)
  const realReturnDuringDrawdown = ((1 + expectedReturn / 100) / (1 + inflationRate / 100) - 1) * 100;

  // Monthly income at retirement in today's euros (inflation-adjusted target)
  const inflatedMonthlyIncome = Math.round(
    targetMonthlyIncome * Math.pow(1 + inflationRate / 100, yearsToRetirement),
  );

  // Required nest egg at retirement to fund monthly income for lifespan
  const requiredNestEgg = pvAnnuity(inflatedMonthlyIncome, realReturnDuringDrawdown, monthsInRetirement);

  // Projected nest egg if no extra contributions made from now
  const projectedNestEgg = fvLumpSum(currentSavings, expectedReturn, yearsToRetirement);

  // Shortfall
  const shortfall = Math.max(0, requiredNestEgg - projectedNestEgg);

  // Monthly savings needed to cover the shortfall
  const monthlySavingsNeeded = monthlyContributionNeeded(
    currentSavings,
    requiredNestEgg,
    expectedReturn,
    yearsToRetirement,
  );

  // Annual projection (accumulation phase, saving the needed monthly amount)
  const annualProjection: YearlyProjection[] = [];
  const r = expectedReturn / 12 / 100;

  for (let year = 1; year <= yearsToRetirement; year++) {
    const months = year * 12;
    const fvInitial = Math.round(currentSavings * Math.pow(1 + r, months));
    let fvContributions: number;
    if (r === 0) {
      fvContributions = monthlySavingsNeeded * months;
    } else {
      fvContributions = Math.round(
        monthlySavingsNeeded * (Math.pow(1 + r, months) - 1) / r,
      );
    }
    const total = fvInitial + fvContributions;
    const contributed = currentSavings + monthlySavingsNeeded * months;
    const returns = total - contributed;

    const inflationFactor = Math.pow(1 + inflationRate / 100, year);
    const realValue = Math.round(total / inflationFactor);

    annualProjection.push({
      year,
      contributed,
      returns,
      total,
      realValue,
    });
  }

  return {
    requiredNestEgg,
    monthlySavingsNeeded,
    yearsToRetirement,
    projectedNestEgg,
    shortfall,
    annualProjection,
  };
}
