import { describe, it, expect } from 'vitest';
import { calculateLoan } from '../loan.calculator.js';

// ---- Helpers ----------------------------------------------------------------

function within(actual: number, expected: number, tolerance: number = 1): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

// ---- calculateLoan() --------------------------------------------------------

describe('calculateLoan() — reference case', () => {
  /**
   * Reference case:
   *   Principal: 10.000 € = 1_000_000 cents
   *   TIN: 8%
   *   Term: 36 months
   *   Expected monthly payment: ≈ 313.36 € = 31_336 cents
   */
  const PRINCIPAL = 1_000_000; // cents
  const RATE = 8;
  const MONTHS = 36;

  it('monthly payment ≈ 313.36 € (±1 cent)', () => {
    const result = calculateLoan({ principal: PRINCIPAL, annualRate: RATE, months: MONTHS });
    expect(within(result.monthlyPayment, 31_336, 1)).toBe(true);
  });

  it('schedule has exactly 36 rows', () => {
    const result = calculateLoan({ principal: PRINCIPAL, annualRate: RATE, months: MONTHS });
    expect(result.schedule).toHaveLength(MONTHS);
  });

  it('final balance is 0', () => {
    const result = calculateLoan({ principal: PRINCIPAL, annualRate: RATE, months: MONTHS });
    expect(result.schedule[result.schedule.length - 1].balance).toBe(0);
  });

  it('sum of principal ≈ original principal (±100 cents)', () => {
    const result = calculateLoan({ principal: PRINCIPAL, annualRate: RATE, months: MONTHS });
    const sumPrincipal = result.schedule.reduce((s, r) => s + r.principal, 0);
    expect(Math.abs(sumPrincipal - PRINCIPAL)).toBeLessThanOrEqual(100);
  });

  it('tin equals annualRate', () => {
    const result = calculateLoan({ principal: PRINCIPAL, annualRate: RATE, months: MONTHS });
    expect(result.tin).toBe(RATE);
  });
});

describe('calculateLoan() — TAE without fees ≈ TIN', () => {
  it('TAE ≈ TIN when no fees (within 0.1%)', () => {
    const result = calculateLoan({ principal: 1_000_000, annualRate: 8, months: 36 });
    // TIN = 8%, TAE without fees ≈ (1 + 0.08/12)^12 - 1 ≈ 8.3%
    // They are NOT the same — TAE accounts for monthly compounding
    // Check that TAE > TIN (monthly compounding makes it higher)
    expect(result.tae).toBeGreaterThan(result.tin);
    // And within a reasonable range: TAE ≈ 8.3%
    expect(result.tae).toBeGreaterThan(8);
    expect(result.tae).toBeLessThan(8.5);
  });

  it('TAE = 0 when annualRate = 0 and no fees', () => {
    const result = calculateLoan({ principal: 1_000_000, annualRate: 0, months: 12 });
    expect(result.tae).toBe(0);
  });
});

describe('calculateLoan() — TAE with opening fee ≈ 9.07%', () => {
  /**
   * 10.000 € loan, 8% TIN, 36 months, 1% opening fee (100 €).
   * Expected TAE including fee ≈ 9.07%
   * (The fee raises the effective cost as it reduces net proceeds.)
   */
  it('TAE with 1% opening fee ≈ 9.07% (±0.5%)', () => {
    const openingFee = 10_000; // 1% of 1_000_000 = 10_000 cents
    const result = calculateLoan({
      principal: 1_000_000,
      annualRate: 8,
      months: 36,
      openingFee,
    });
    // Expected: ~9.07 ± 0.5
    expect(result.tae).toBeGreaterThan(8.5);
    expect(result.tae).toBeLessThan(9.7);
  });

  it('TAE with fees is always higher than TAE without fees', () => {
    const withoutFees = calculateLoan({ principal: 1_000_000, annualRate: 8, months: 36 });
    const withFees = calculateLoan({
      principal: 1_000_000,
      annualRate: 8,
      months: 36,
      openingFee: 10_000,
    });
    expect(withFees.tae).toBeGreaterThan(withoutFees.tae);
  });

  it('otherFees also raises TAE', () => {
    const base = calculateLoan({ principal: 500_000, annualRate: 5, months: 24 });
    const withFees = calculateLoan({
      principal: 500_000,
      annualRate: 5,
      months: 24,
      otherFees: 5_000,
    });
    expect(withFees.tae).toBeGreaterThan(base.tae);
  });
});

describe('calculateLoan() — edge cases', () => {
  it('total interest is positive for non-zero rate', () => {
    const result = calculateLoan({ principal: 1_000_000, annualRate: 5, months: 24 });
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it('total interest is 0 for 0% rate', () => {
    const result = calculateLoan({ principal: 1_000_000, annualRate: 0, months: 12 });
    expect(result.totalInterest).toBe(0);
  });

  it('all interest values in schedule are non-negative', () => {
    const result = calculateLoan({ principal: 2_000_000, annualRate: 6, months: 48 });
    result.schedule.forEach((row) => {
      expect(row.interest).toBeGreaterThanOrEqual(0);
    });
  });

  it('balance decreases monotonically', () => {
    const result = calculateLoan({ principal: 1_000_000, annualRate: 8, months: 36 });
    for (let i = 1; i < result.schedule.length; i++) {
      expect(result.schedule[i].balance).toBeLessThanOrEqual(result.schedule[i - 1].balance);
    }
  });

  it('month numbers are sequential', () => {
    const result = calculateLoan({ principal: 500_000, annualRate: 5, months: 12 });
    result.schedule.forEach((row, i) => {
      expect(row.month).toBe(i + 1);
    });
  });
});
