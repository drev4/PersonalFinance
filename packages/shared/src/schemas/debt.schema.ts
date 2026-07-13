import { z } from 'zod';

export const DebtTypeEnum = z.enum([
  'credit_card',
  'personal_loan',
  'mortgage',
  'student_loan',
  'car_loan',
  'other',
]);

export type DebtType = z.infer<typeof DebtTypeEnum>;

export const DebtInfoSchema = z.object({
  paidAmount: z.number(),
  percentPaid: z.number(),
  monthsToPayoff: z.number().nullable(),
  totalInterestEstimate: z.number().nullable(),
  monthlyInterestCharge: z.number().nullable(),
});

export type DebtInfo = z.infer<typeof DebtInfoSchema>;

export const DebtSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: DebtTypeEnum,
  currency: z.string(),
  originalAmount: z.number(),
  currentBalance: z.number(),
  interestRate: z.number(),
  minimumPayment: z.number(),
  nextPaymentDate: z.string().optional(),
  linkedAccountId: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  notes: z.string().optional(),
  isPaidOff: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  info: DebtInfoSchema.optional(),
});

export type Debt = z.infer<typeof DebtSchema>;
