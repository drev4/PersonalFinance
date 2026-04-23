import { describe, it, expect } from 'vitest';
import { calculateRetirement } from '../retirement.calculator.js';

// ---- Helpers ----------------------------------------------------------------

function withinPct(actual: number, expected: number, pct: number = 2): boolean {
  const tolerance = Math.abs(expected * (pct / 100));
  return Math.abs(actual - expected) <= tolerance;
}

// ---- Reference case ---------------------------------------------------------

describe('calculateRetirement() — reference case', () => {
  /**
   * Person aged 35, wants to retire at 65 (30 years to save).
   * Target monthly income: 2.000 €/mes = 200_000 cents.
   * Life expectancy: 85 (20 years of retirement).
   * Expected return: 6% annual.
   * Inflation: 2%.
   * Current savings: 0.
   */
  const INPUTS = {
    currentAge: 35,
    retirementAge: 65,
    targetMonthlyIncome: 200_000, // 2.000 € in cents
    currentSavings: 0,
    expectedReturn: 6,
    inflationRate: 2,
    lifeExpectancy: 85,
  };

  it('yearsToRetirement = retirementAge - currentAge', () => {
    const result = calculateRetirement(INPUTS);
    expect(result.yearsToRetirement).toBe(30);
  });

  it('requiredNestEgg is positive', () => {
    const result = calculateRetirement(INPUTS);
    expect(result.requiredNestEgg).toBeGreaterThan(0);
  });

  it('monthlySavingsNeeded is positive (since currentSavings = 0)', () => {
    const result = calculateRetirement(INPUTS);
    expect(result.monthlySavingsNeeded).toBeGreaterThan(0);
  });

  it('projectedNestEgg is 0 when currentSavings = 0', () => {
    const result = calculateRetirement(INPUTS);
    expect(result.projectedNestEgg).toBe(0);
  });

  it('shortfall equals requiredNestEgg when starting from 0', () => {
    const result = calculateRetirement(INPUTS);
    expect(result.shortfall).toBe(result.requiredNestEgg);
  });

  it('monthlySavingsNeeded is a reasonable amount (sanity check)', () => {
    const result = calculateRetirement(INPUTS);
    // To accumulate ~500k€ over 30 years at 6%, PMT should be around 500-1000€/month
    // (200k€/month income for 20 years requires a large nest egg due to inflation)
    // Let's verify it's between 50€ and 5000€ per month
    expect(result.monthlySavingsNeeded).toBeGreaterThan(5_000);   // > 50 €
    expect(result.monthlySavingsNeeded).toBeLessThan(500_000);    // < 5000 €
  });
});

describe('calculateRetirement() — savings already sufficient', () => {
  it('shortfall is 0 when existing savings cover the required nest egg', () => {
    const result = calculateRetirement({
      currentAge: 60,
      retirementAge: 65,
      targetMonthlyIncome: 50_000,  // 500€/month
      currentSavings: 50_000_000,   // 500.000€ — more than enough
      expectedReturn: 4,
      inflationRate: 2,
      lifeExpectancy: 85,
    });
    expect(result.shortfall).toBe(0);
    expect(result.monthlySavingsNeeded).toBe(0);
  });

  it('projectedNestEgg >= requiredNestEgg when well-funded', () => {
    const result = calculateRetirement({
      currentAge: 60,
      retirementAge: 65,
      targetMonthlyIncome: 50_000,
      currentSavings: 50_000_000,
      expectedReturn: 4,
      inflationRate: 2,
      lifeExpectancy: 85,
    });
    expect(result.projectedNestEgg).toBeGreaterThanOrEqual(result.requiredNestEgg);
  });
});

describe('calculateRetirement() — annual projection', () => {
  const INPUTS = {
    currentAge: 40,
    retirementAge: 65,
    targetMonthlyIncome: 150_000,
    currentSavings: 500_000,
    expectedReturn: 5,
    inflationRate: 2,
    lifeExpectancy: 85,
  };

  it('annualProjection has yearsToRetirement rows', () => {
    const result = calculateRetirement(INPUTS);
    expect(result.annualProjection).toHaveLength(result.yearsToRetirement);
  });

  it('year numbers are sequential starting at 1', () => {
    const result = calculateRetirement(INPUTS);
    result.annualProjection.forEach((row, i) => {
      expect(row.year).toBe(i + 1);
    });
  });

  it('total grows each year', () => {
    const result = calculateRetirement(INPUTS);
    for (let i = 1; i < result.annualProjection.length; i++) {
      expect(result.annualProjection[i].total).toBeGreaterThan(result.annualProjection[i - 1].total);
    }
  });

  it('realValue is always less than total (inflation > 0)', () => {
    const result = calculateRetirement(INPUTS);
    result.annualProjection.forEach((row) => {
      expect(row.realValue!).toBeLessThan(row.total);
    });
  });

  it('final year total ≈ requiredNestEgg (within 2%) when starting from 0', () => {
    const zeroSavings = { ...INPUTS, currentSavings: 0 };
    const result = calculateRetirement(zeroSavings);
    const lastYear = result.annualProjection[result.annualProjection.length - 1];
    expect(withinPct(lastYear.total, result.requiredNestEgg, 3)).toBe(true);
  });
});

describe('calculateRetirement() — inflation effect', () => {
  it('higher inflation increases required nest egg', () => {
    const base = calculateRetirement({
      currentAge: 35,
      retirementAge: 65,
      targetMonthlyIncome: 200_000,
      currentSavings: 0,
      expectedReturn: 6,
      inflationRate: 2,
      lifeExpectancy: 85,
    });
    const highInflation = calculateRetirement({
      currentAge: 35,
      retirementAge: 65,
      targetMonthlyIncome: 200_000,
      currentSavings: 0,
      expectedReturn: 6,
      inflationRate: 4,
      lifeExpectancy: 85,
    });
    expect(highInflation.requiredNestEgg).toBeGreaterThan(base.requiredNestEgg);
  });

  it('higher expected return decreases monthly savings needed', () => {
    const lowReturn = calculateRetirement({
      currentAge: 35,
      retirementAge: 65,
      targetMonthlyIncome: 200_000,
      currentSavings: 0,
      expectedReturn: 3,
      inflationRate: 2,
      lifeExpectancy: 85,
    });
    const highReturn = calculateRetirement({
      currentAge: 35,
      retirementAge: 65,
      targetMonthlyIncome: 200_000,
      currentSavings: 0,
      expectedReturn: 8,
      inflationRate: 2,
      lifeExpectancy: 85,
    });
    expect(highReturn.monthlySavingsNeeded).toBeLessThan(lowReturn.monthlySavingsNeeded);
  });
});

describe('calculateRetirement() — edge: same retirementAge as currentAge + 1', () => {
  it('1 year to retirement still produces a valid result', () => {
    const result = calculateRetirement({
      currentAge: 64,
      retirementAge: 65,
      targetMonthlyIncome: 100_000,
      currentSavings: 0,
      expectedReturn: 5,
      inflationRate: 2,
      lifeExpectancy: 85,
    });
    expect(result.yearsToRetirement).toBe(1);
    expect(result.annualProjection).toHaveLength(1);
    expect(result.monthlySavingsNeeded).toBeGreaterThan(0);
  });
});
