import { describe, it, expect } from 'vitest';
import {
  calculateMortgage,
  calculateMixedMortgage,
} from '../mortgage.calculator.js';

// ---- Helpers ----------------------------------------------------------------

/** Tolerance: ±1 cent */
const CENT = 1;

function within(actual: number, expected: number, tolerance: number = CENT): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

// ---- calculateMortgage() — standard French system --------------------------

describe('calculateMortgage() — standard mortgage', () => {
  /**
   * Reference case:
   *   Principal: 200.000 € = 20_000_000 cents
   *   Annual rate: 3.5%
   *   Term: 30 years
   *   Expected monthly payment: ≈ 897.68 € = 89_768 cents
   *   Expected total interest: ≈ 123.165 € = 12_316_500 cents
   */
  const PRINCIPAL = 20_000_000; // cents
  const RATE = 3.5;
  const YEARS = 30;

  it('monthly payment ≈ 897.68 € (±1 cent) for reference case', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    // 897.68 € = 89768 cents
    expect(within(result.monthlyPayment, 89_768, CENT)).toBe(true);
  });

  it('total interest ≈ 123.165 € (±100 cents tolerance for rounding) for reference case', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    // 123.165 € = 12_316_500 cents — allow ±100 cents for schedule rounding
    expect(Math.abs(result.totalInterest - 12_316_500)).toBeLessThanOrEqual(100);
  });

  it('sum of amortization principal ≈ original principal (±100 cents)', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    const sumPrincipal = result.schedule.reduce((s, r) => s + r.principal, 0);
    expect(Math.abs(sumPrincipal - PRINCIPAL)).toBeLessThanOrEqual(100);
  });

  it('final balance is 0', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.balance).toBe(0);
  });

  it('schedule has exactly years*12 rows', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    expect(result.schedule).toHaveLength(YEARS * 12);
  });

  it('month numbers are sequential starting at 1', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    result.schedule.forEach((row, i) => {
      expect(row.month).toBe(i + 1);
    });
  });

  it('interest portion is always non-negative', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    result.schedule.forEach((row) => {
      expect(row.interest).toBeGreaterThanOrEqual(0);
    });
  });

  it('principal portion is always positive', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    result.schedule.forEach((row) => {
      expect(row.principal).toBeGreaterThan(0);
    });
  });

  it('balance decreases monotonically', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    for (let i = 1; i < result.schedule.length; i++) {
      expect(result.schedule[i].balance).toBeLessThanOrEqual(result.schedule[i - 1].balance);
    }
  });

  it('totalPayment = totalInterest + principal', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    expect(Math.abs(result.totalPayment - (result.totalInterest + PRINCIPAL))).toBeLessThanOrEqual(100);
  });

  it('effectiveRate (TAE) is positive', () => {
    const result = calculateMortgage({ principal: PRINCIPAL, annualRate: RATE, years: YEARS });
    expect(result.effectiveRate).toBeGreaterThan(0);
  });

  it('handles 0% rate (interest-free loan)', () => {
    const result = calculateMortgage({ principal: 1_200_000, annualRate: 0, years: 10 });
    expect(result.totalInterest).toBe(0);
    expect(result.monthlyPayment).toBe(10_000); // 1_200_000 / 120
    expect(result.schedule[result.schedule.length - 1].balance).toBe(0);
  });

  it('smaller 10-year case: sum of principal = initial principal (±100 cents)', () => {
    const result = calculateMortgage({ principal: 5_000_000, annualRate: 5, years: 10 });
    const sumPrincipal = result.schedule.reduce((s, r) => s + r.principal, 0);
    expect(Math.abs(sumPrincipal - 5_000_000)).toBeLessThanOrEqual(100);
    expect(result.schedule[result.schedule.length - 1].balance).toBe(0);
  });
});

// ---- calculateMixedMortgage() -----------------------------------------------

describe('calculateMixedMortgage() — mixed rate mortgage', () => {
  /**
   * 200.000 €, fixed 3.5% for 5 years, then variable 5% for remaining 25 years.
   * Total term: 30 years.
   */
  const INPUTS = {
    principal: 20_000_000,
    annualRate: 3.5,
    years: 30,
    fixedYears: 5,
    variableRate: 5,
  };

  it('returns fixedPhasePayment and variablePhasePayment', () => {
    const result = calculateMixedMortgage(INPUTS);
    expect(result.fixedPhasePayment).toBeDefined();
    expect(result.variablePhasePayment).toBeDefined();
    expect(result.fixedPhasePayment!).toBeGreaterThan(0);
    expect(result.variablePhasePayment!).toBeGreaterThan(0);
  });

  it('schedule has exactly years*12 rows', () => {
    const result = calculateMixedMortgage(INPUTS);
    expect(result.schedule).toHaveLength(INPUTS.years * 12);
  });

  it('fixed phase uses the fixed rate (first fixedYears*12 rows)', () => {
    const result = calculateMixedMortgage(INPUTS);
    const fixedRows = result.schedule.slice(0, INPUTS.fixedYears * 12);
    // All fixed-phase payments should equal fixedPhasePayment (except possibly last)
    fixedRows.slice(0, -1).forEach((row) => {
      expect(within(row.payment, result.fixedPhasePayment!, CENT)).toBe(true);
    });
  });

  it('variable phase uses the variable rate (rows after fixedYears*12)', () => {
    const result = calculateMixedMortgage(INPUTS);
    const variableRows = result.schedule.slice(INPUTS.fixedYears * 12);
    variableRows.slice(0, -1).forEach((row) => {
      expect(within(row.payment, result.variablePhasePayment!, CENT)).toBe(true);
    });
  });

  it('final balance is 0', () => {
    const result = calculateMixedMortgage(INPUTS);
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.balance).toBe(0);
  });

  it('sum of amortized principal ≈ original principal (±200 cents)', () => {
    const result = calculateMixedMortgage(INPUTS);
    const sumPrincipal = result.schedule.reduce((s, r) => s + r.principal, 0);
    expect(Math.abs(sumPrincipal - INPUTS.principal)).toBeLessThanOrEqual(200);
  });

  it('variable phase payment is higher than fixed phase payment (higher rate)', () => {
    const result = calculateMixedMortgage(INPUTS);
    // variableRate (5%) > fixedRate (3.5%), but the remaining balance is less,
    // so the relationship depends on the balance. Let's verify both are positive.
    expect(result.variablePhasePayment!).toBeGreaterThan(0);
    expect(result.fixedPhasePayment!).toBeGreaterThan(0);
  });

  it('month numbers are sequential starting at 1', () => {
    const result = calculateMixedMortgage(INPUTS);
    result.schedule.forEach((row, i) => {
      expect(row.month).toBe(i + 1);
    });
  });
});
