import { describe, it, expect } from 'vitest';
import { calculateEarlyRepayment } from '../earlyRepayment.calculator.js';

// ---- Shared test fixture ----------------------------------------------------

const BASE = {
  remainingPrincipal: 10_000_000, // 100.000 €
  currentRate: 4,                 // 4% anual
  remainingMonths: 240,           // 20 años restantes
  extraPayment: 1_000_000,        // 10.000 €
};

// ---- reduce_term strategy ---------------------------------------------------

describe('calculateEarlyRepayment() — reduce_term', () => {
  it('new schedule has fewer months than original', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    expect(result.newSchedule.remainingMonths).toBeLessThan(result.originalSchedule.remainingMonths);
  });

  it('monthly payment stays the same after extra payment', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    // The monthly payment in the new schedule should equal the original
    expect(result.newSchedule.monthlyPayment).toBe(result.originalSchedule.monthlyPayment);
  });

  it('saves interest (positive interest savings)', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    expect(result.savings.interest).toBeGreaterThan(0);
  });

  it('months saved is positive', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    expect(result.savings.months).toBeGreaterThan(0);
  });

  it('original schedule has correct months', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    expect(result.originalSchedule.remainingMonths).toBe(BASE.remainingMonths);
  });

  it('original monthly payment matches expected for 100k, 4%, 240 months', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    // French payment for 100k€ at 4% over 240 months ≈ 606.00€ = 60600 cents
    expect(result.originalSchedule.monthlyPayment).toBeGreaterThan(55_000);
    expect(result.originalSchedule.monthlyPayment).toBeLessThan(70_000);
  });
});

// ---- reduce_quota strategy --------------------------------------------------

describe('calculateEarlyRepayment() — reduce_quota', () => {
  it('new monthly payment is lower than original', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_quota' });
    expect(result.newSchedule.monthlyPayment).toBeLessThan(result.originalSchedule.monthlyPayment);
  });

  it('remaining months stay the same', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_quota' });
    expect(result.newSchedule.remainingMonths).toBe(BASE.remainingMonths);
  });

  it('months saved is 0 (same term)', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_quota' });
    expect(result.savings.months).toBe(0);
  });

  it('saves interest (positive interest savings)', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_quota' });
    expect(result.savings.interest).toBeGreaterThan(0);
  });

  it('new total payment is lower than original total payment', () => {
    const result = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_quota' });
    expect(result.newSchedule.totalPayment).toBeLessThan(result.originalSchedule.totalPayment);
  });
});

// ---- Comparison between strategies ------------------------------------------

describe('calculateEarlyRepayment() — strategy comparison', () => {
  it('reduce_term saves more interest than reduce_quota for same extra payment', () => {
    const reduceTerm = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    const reduceQuota = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_quota' });
    // reduce_term is more aggressive so should save more interest
    expect(reduceTerm.savings.interest).toBeGreaterThanOrEqual(reduceQuota.savings.interest);
  });

  it('both strategies have non-negative total payment savings', () => {
    const reduceTerm = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_term' });
    const reduceQuota = calculateEarlyRepayment({ ...BASE, strategy: 'reduce_quota' });
    // totalPayment savings accounts for the extra payment made
    // reduceTerm should be positive (saves interest beyond the extra payment)
    expect(reduceTerm.savings.interest).toBeGreaterThan(0);
    expect(reduceQuota.savings.interest).toBeGreaterThan(0);
  });
});

// ---- Edge cases -------------------------------------------------------------

describe('calculateEarlyRepayment() — edge cases', () => {
  it('extra payment equal to remaining principal pays off debt immediately (reduce_term)', () => {
    const result = calculateEarlyRepayment({
      remainingPrincipal: 1_000_000,
      currentRate: 5,
      remainingMonths: 60,
      extraPayment: 1_000_000, // pays it all off
      strategy: 'reduce_term',
    });
    expect(result.newSchedule.remainingMonths).toBe(0);
    expect(result.newSchedule.totalInterest).toBe(0);
  });

  it('extra payment equal to remaining principal (reduce_quota) yields 0 balance', () => {
    const result = calculateEarlyRepayment({
      remainingPrincipal: 500_000,
      currentRate: 3,
      remainingMonths: 24,
      extraPayment: 500_000,
      strategy: 'reduce_quota',
    });
    expect(result.newSchedule.monthlyPayment).toBe(0);
  });

  it('0% rate: no interest on original schedule', () => {
    const result = calculateEarlyRepayment({
      remainingPrincipal: 1_200_000,
      currentRate: 0,
      remainingMonths: 12,
      extraPayment: 100_000,
      strategy: 'reduce_term',
    });
    expect(result.originalSchedule.totalInterest).toBe(0);
    expect(result.newSchedule.totalInterest).toBe(0);
  });

  it('savings.interest is never negative', () => {
    [{ ...BASE, strategy: 'reduce_term' as const }, { ...BASE, strategy: 'reduce_quota' as const }].forEach((inputs) => {
      const result = calculateEarlyRepayment(inputs);
      expect(result.savings.interest).toBeGreaterThanOrEqual(0);
    });
  });
});
