import { z } from 'zod';

export const SimulationTypeEnum = z.enum([
  'savings_goal',
  'investment_return',
  'loan_payoff',
  'compound_interest',
]);

export type SimulationType = z.infer<typeof SimulationTypeEnum>;

export const SavingsGoalSimulationSchema = z.object({
  type: z.literal('savings_goal'),
  initialAmount: z.number().nonnegative(),
  monthlyContribution: z.number().nonnegative(),
  targetAmount: z.number().positive(),
  interestRate: z.number().nonnegative(),
  currency: z.string().length(3),
});

export type SavingsGoalSimulation = z.infer<typeof SavingsGoalSimulationSchema>;

export const InvestmentReturnSimulationSchema = z.object({
  type: z.literal('investment_return'),
  initialInvestment: z.number().positive(),
  monthlyInvestment: z.number().nonnegative(),
  expectedAnnualReturn: z.number(),
  years: z.number().int().positive(),
  currency: z.string().length(3),
});

export type InvestmentReturnSimulation = z.infer<typeof InvestmentReturnSimulationSchema>;

export const LoanPayoffSimulationSchema = z.object({
  type: z.literal('loan_payoff'),
  principalAmount: z.number().positive(),
  annualInterestRate: z.number().nonnegative(),
  loanTermMonths: z.number().int().positive(),
  monthlyPayment: z.number().positive(),
  currency: z.string().length(3),
});

export type LoanPayoffSimulation = z.infer<typeof LoanPayoffSimulationSchema>;

export const CompoundInterestSimulationSchema = z.object({
  type: z.literal('compound_interest'),
  principal: z.number().positive(),
  rate: z.number().nonnegative(),
  years: z.number().int().positive(),
  compoundFrequency: z.enum(['annually', 'semiannually', 'quarterly', 'monthly', 'daily']),
  currency: z.string().length(3),
});

export type CompoundInterestSimulation = z.infer<typeof CompoundInterestSimulationSchema>;

export const SimulationSchema = z.union([
  SavingsGoalSimulationSchema,
  InvestmentReturnSimulationSchema,
  LoanPayoffSimulationSchema,
  CompoundInterestSimulationSchema,
]);

export type Simulation = z.infer<typeof SimulationSchema>;

export const SimulationResultSchema = z.object({
  id: z.string().min(1, 'Simulation result ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Simulation name is required'),
  description: z.string().optional(),
  simulation: SimulationSchema,
  result: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SimulationResult = z.infer<typeof SimulationResultSchema>;
