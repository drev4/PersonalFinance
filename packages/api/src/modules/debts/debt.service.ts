import {
  findByUser,
  findById,
  create,
  update,
  deactivate,
  type CreateDebtDTO,
  type UpdateDebtDTO,
} from './debt.repository.js';
import { invalidateNetWorthCache } from '../dashboard/dashboard.service.js';
import type { IDebt } from './debt.model.js';

// ---- Error class -------------------------------------------------------------

export class DebtError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'DebtError';
  }
}

// ---- Payoff calculations -----------------------------------------------------

export interface DebtInfo {
  paidAmount: number; // cents
  percentPaid: number; // 0–100
  monthsToPayoff: number | null;
  totalInterestEstimate: number | null; // cents
  monthlyInterestCharge: number | null; // cents for current balance
}

export function calculateDebtInfo(debt: IDebt): DebtInfo {
  const paidAmount = Math.max(0, debt.originalAmount - debt.currentBalance);
  const percentPaid =
    debt.originalAmount > 0
      ? Math.min(100, Math.round((paidAmount / debt.originalAmount) * 1000) / 10)
      : 0;

  if (debt.currentBalance <= 0) {
    return {
      paidAmount,
      percentPaid: 100,
      monthsToPayoff: 0,
      totalInterestEstimate: 0,
      monthlyInterestCharge: 0,
    };
  }

  const annualRate = debt.interestRate;
  const balance = debt.currentBalance;
  const minPayment = debt.minimumPayment;

  if (annualRate === 0) {
    const monthsToPayoff = minPayment > 0 ? Math.ceil(balance / minPayment) : null;
    return {
      paidAmount,
      percentPaid,
      monthsToPayoff,
      totalInterestEstimate: 0,
      monthlyInterestCharge: 0,
    };
  }

  const monthlyRate = annualRate / 100 / 12;
  const monthlyInterestCharge = Math.round(balance * monthlyRate);

  if (minPayment <= 0 || minPayment <= monthlyInterestCharge) {
    // Can't pay off — negative or zero amortization
    return {
      paidAmount,
      percentPaid,
      monthsToPayoff: null,
      totalInterestEstimate: null,
      monthlyInterestCharge,
    };
  }

  // Standard amortization formula: n = -ln(1 - r*PV/PMT) / ln(1+r)
  const n = -Math.log(1 - (monthlyRate * balance) / minPayment) / Math.log(1 + monthlyRate);
  const monthsToPayoff = Math.ceil(n);
  const totalInterestEstimate = Math.round(monthsToPayoff * minPayment - balance);

  return {
    paidAmount,
    percentPaid,
    monthsToPayoff,
    totalInterestEstimate: Math.max(0, totalInterestEstimate),
    monthlyInterestCharge,
  };
}

// ---- Service functions -------------------------------------------------------

export async function getUserDebts(userId: string): Promise<IDebt[]> {
  return findByUser(userId);
}

export async function getDebt(userId: string, debtId: string): Promise<IDebt> {
  const debt = await findById(debtId, userId);
  if (debt === null) {
    throw new DebtError('DEBT_NOT_FOUND', 'Debt not found', 404);
  }
  return debt;
}

export async function createDebt(userId: string, dto: CreateDebtDTO): Promise<IDebt> {
  const debt = await create({ ...dto, userId });
  void invalidateNetWorthCache(userId);
  return debt;
}

export async function updateDebt(
  userId: string,
  debtId: string,
  dto: UpdateDebtDTO,
): Promise<IDebt> {
  const existing = await findById(debtId, userId);
  if (existing === null) {
    throw new DebtError('DEBT_NOT_FOUND', 'Debt not found', 404);
  }

  const newBalance = dto.currentBalance ?? existing.currentBalance;
  const shouldMarkPaidOff = newBalance <= 0;

  const updated = await update(debtId, userId, {
    ...dto,
    isPaidOff: shouldMarkPaidOff,
  });

  if (updated === null) {
    throw new DebtError('DEBT_NOT_FOUND', 'Debt not found', 404);
  }

  // Balance change affects net worth
  if (dto.currentBalance !== undefined) {
    void invalidateNetWorthCache(userId);
  }

  return updated;
}

export async function deleteDebt(userId: string, debtId: string): Promise<void> {
  const success = await deactivate(debtId, userId);
  if (!success) {
    throw new DebtError('DEBT_NOT_FOUND', 'Debt not found', 404);
  }
  void invalidateNetWorthCache(userId);
}

export async function makePayment(userId: string, debtId: string, amount: number): Promise<IDebt> {
  const existing = await findById(debtId, userId);
  if (existing === null) {
    throw new DebtError('DEBT_NOT_FOUND', 'Debt not found', 404);
  }
  if (existing.isPaidOff) {
    throw new DebtError('DEBT_PAID_OFF', 'This debt is already paid off', 400);
  }
  if (amount <= 0) {
    throw new DebtError('INVALID_AMOUNT', 'Payment amount must be positive', 400);
  }

  const newBalance = Math.max(0, existing.currentBalance - amount);
  const isPaidOff = newBalance === 0;

  const updated = await update(debtId, userId, { currentBalance: newBalance, isPaidOff });
  if (updated === null) {
    throw new DebtError('DEBT_NOT_FOUND', 'Debt not found', 404);
  }

  void invalidateNetWorthCache(userId);

  return updated;
}
