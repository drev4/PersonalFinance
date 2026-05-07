import mongoose from 'mongoose';
import { DebtModel, type IDebt, type DebtType } from './debt.model.js';

export interface CreateDebtDTO {
  userId: string;
  name: string;
  type: DebtType;
  currency: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  nextPaymentDate?: Date;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
  notes?: string;
}

export interface UpdateDebtDTO {
  name?: string;
  type?: DebtType;
  currency?: string;
  originalAmount?: number;
  currentBalance?: number;
  interestRate?: number;
  minimumPayment?: number;
  nextPaymentDate?: Date;
  linkedAccountId?: string;
  color?: string;
  icon?: string;
  notes?: string;
  isPaidOff?: boolean;
}

// Active debts + paid-off debts from the last 30 days
export async function findByUser(userId: string): Promise<IDebt[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return DebtModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
    $or: [{ isPaidOff: false }, { isPaidOff: true, updatedAt: { $gte: thirtyDaysAgo } }],
  })
    .sort({ createdAt: -1 })
    .exec();
}

export async function findById(id: string, userId: string): Promise<IDebt | null> {
  return DebtModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  }).exec();
}

export async function create(data: CreateDebtDTO): Promise<IDebt> {
  const debt = new DebtModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    name: data.name,
    type: data.type,
    currency: data.currency,
    originalAmount: data.originalAmount,
    currentBalance: data.currentBalance,
    interestRate: data.interestRate,
    minimumPayment: data.minimumPayment,
    nextPaymentDate: data.nextPaymentDate,
    linkedAccountId:
      data.linkedAccountId !== undefined
        ? new mongoose.Types.ObjectId(data.linkedAccountId)
        : undefined,
    color: data.color,
    icon: data.icon,
    notes: data.notes,
    isPaidOff: false,
    isActive: true,
  });
  return debt.save();
}

export async function update(
  id: string,
  userId: string,
  data: Partial<UpdateDebtDTO>,
): Promise<IDebt | null> {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload['name'] = data.name;
  if (data.type !== undefined) payload['type'] = data.type;
  if (data.currency !== undefined) payload['currency'] = data.currency;
  if (data.originalAmount !== undefined) payload['originalAmount'] = data.originalAmount;
  if (data.currentBalance !== undefined) payload['currentBalance'] = data.currentBalance;
  if (data.interestRate !== undefined) payload['interestRate'] = data.interestRate;
  if (data.minimumPayment !== undefined) payload['minimumPayment'] = data.minimumPayment;
  if (data.nextPaymentDate !== undefined) payload['nextPaymentDate'] = data.nextPaymentDate;
  if (data.linkedAccountId !== undefined) {
    payload['linkedAccountId'] = new mongoose.Types.ObjectId(data.linkedAccountId);
  }
  if (data.color !== undefined) payload['color'] = data.color;
  if (data.icon !== undefined) payload['icon'] = data.icon;
  if (data.notes !== undefined) payload['notes'] = data.notes;
  if (data.isPaidOff !== undefined) payload['isPaidOff'] = data.isPaidOff;

  return DebtModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: payload },
    { new: true, runValidators: true },
  ).exec();
}

export async function deactivate(id: string, userId: string): Promise<boolean> {
  const result = await DebtModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: { isActive: false } },
  ).exec();
  return result !== null;
}
