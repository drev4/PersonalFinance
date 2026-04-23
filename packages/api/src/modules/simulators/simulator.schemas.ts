import { z } from 'zod';

// ---- Shared helpers ---------------------------------------------------------

const cents = z.number().int('Must be an integer (cents)').nonnegative();
const positiveCents = z.number().int('Must be an integer (cents)').positive();
const annualRate = z.number().nonnegative().max(100);
const positiveInt = z.number().int().positive();

// ---- Mortgage ---------------------------------------------------------------

export const MortgageSchema = z.object({
  principal: positiveCents,
  annualRate: annualRate,
  years: positiveInt.max(50),
});

export const MixedMortgageSchema = MortgageSchema.extend({
  fixedYears: positiveInt,
  variableRate: annualRate,
}).refine(
  (d) => d.fixedYears < d.years,
  { message: 'fixedYears must be less than total years', path: ['fixedYears'] },
);

export type MortgageInput = z.infer<typeof MortgageSchema>;
export type MixedMortgageInput = z.infer<typeof MixedMortgageSchema>;

// ---- Loan -------------------------------------------------------------------

export const LoanSchema = z.object({
  principal: positiveCents,
  annualRate: annualRate,
  months: positiveInt.max(600),
  openingFee: cents.optional(),
  otherFees: cents.optional(),
});

export type LoanInput = z.infer<typeof LoanSchema>;

// ---- Investment -------------------------------------------------------------

export const InvestmentSchema = z.object({
  initialAmount: cents,
  monthlyContribution: cents,
  annualReturn: z.number().min(-50).max(100),
  years: positiveInt.max(100),
  inflationRate: z.number().min(0).max(50).optional(),
});

export type InvestmentInput = z.infer<typeof InvestmentSchema>;

// ---- Early Repayment --------------------------------------------------------

export const EarlyRepaymentSchema = z.object({
  remainingPrincipal: positiveCents,
  currentRate: annualRate,
  remainingMonths: positiveInt.max(600),
  extraPayment: positiveCents,
  strategy: z.enum(['reduce_quota', 'reduce_term']),
});

export type EarlyRepaymentInput = z.infer<typeof EarlyRepaymentSchema>;

// ---- Retirement -------------------------------------------------------------

export const RetirementSchema = z.object({
  currentAge: z.number().int().min(18).max(80),
  retirementAge: z.number().int().min(40).max(90).default(65),
  targetMonthlyIncome: positiveCents,
  currentSavings: cents,
  expectedReturn: annualRate,
  inflationRate: z.number().min(0).max(20),
  lifeExpectancy: z.number().int().min(50).max(120).default(85),
}).refine(
  (d) => d.retirementAge > d.currentAge,
  { message: 'retirementAge must be greater than currentAge', path: ['retirementAge'] },
).refine(
  (d) => d.lifeExpectancy > d.retirementAge,
  { message: 'lifeExpectancy must be greater than retirementAge', path: ['lifeExpectancy'] },
);

export type RetirementInput = z.infer<typeof RetirementSchema>;

// ---- Save simulation body ---------------------------------------------------

export const SaveSimulationSchema = z.object({
  type: z.enum(['mortgage', 'loan', 'investment', 'early_repayment', 'retirement']),
  name: z.string().min(1, 'Name is required').max(150),
  inputs: z.record(z.unknown()),
});

export type SaveSimulationInput = z.infer<typeof SaveSimulationSchema>;
