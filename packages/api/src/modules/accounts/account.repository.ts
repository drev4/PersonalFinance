import mongoose from 'mongoose';
import { AccountModel, type IAccount, type AccountType } from './account.model.js';

export interface CreateAccountDTO {
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  institution?: string;
  notes?: string;
  color?: string;
  icon?: string;
  includedInNetWorth?: boolean;
}

export interface UpdateAccountDTO {
  name?: string;
  type?: AccountType;
  currency?: string;
  institution?: string;
  notes?: string;
  color?: string;
  icon?: string;
  currentBalance?: number;
  includedInNetWorth?: boolean;
}

export interface NetWorthSummary {
  totalBalance: number;
  byType: Record<string, number>;
}

export async function findByUser(userId: string): Promise<IAccount[]> {
  return AccountModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  })
    .sort({ name: 1 })
    .exec();
}

export async function findById(
  id: string,
  userId: string,
): Promise<IAccount | null> {
  return AccountModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
}

export async function create(data: CreateAccountDTO): Promise<IAccount> {
  const account = new AccountModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    name: data.name,
    type: data.type,
    currency: data.currency,
    currentBalance: data.initialBalance,
    initialBalance: data.initialBalance,
    institution: data.institution,
    notes: data.notes,
    color: data.color,
    icon: data.icon,
    isActive: true,
    includedInNetWorth: data.includedInNetWorth ?? true,
  });
  return account.save();
}

export async function update(
  id: string,
  userId: string,
  data: Partial<UpdateAccountDTO>,
): Promise<IAccount | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.name !== undefined) updatePayload['name'] = data.name;
  if (data.type !== undefined) updatePayload['type'] = data.type;
  if (data.currency !== undefined) updatePayload['currency'] = data.currency;
  if (data.institution !== undefined) updatePayload['institution'] = data.institution;
  if (data.notes !== undefined) updatePayload['notes'] = data.notes;
  if (data.color !== undefined) updatePayload['color'] = data.color;
  if (data.icon !== undefined) updatePayload['icon'] = data.icon;
  if (data.includedInNetWorth !== undefined) {
    updatePayload['includedInNetWorth'] = data.includedInNetWorth;
  }
  if (data.currentBalance !== undefined) {
    updatePayload['currentBalance'] = data.currentBalance;
  }

  return AccountModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

export async function updateBalance(
  id: string,
  userId: string,
  newBalance: number,
): Promise<void> {
  await AccountModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    },
    { $set: { currentBalance: newBalance } },
  ).exec();
}

export async function archive(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await AccountModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: { isActive: false } },
  ).exec();
  return result !== null;
}

export async function getNetWorth(
  userId: string,
): Promise<NetWorthSummary> {
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        includedInNetWorth: true,
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$currentBalance' },
      },
    },
  ];

  const results = await AccountModel.aggregate<{ _id: string; total: number }>(
    pipeline,
  ).exec();

  const byType: Record<string, number> = {};
  let totalBalance = 0;

  for (const row of results) {
    byType[row._id] = row.total;
    totalBalance += row.total;
  }

  return { totalBalance, byType };
}
