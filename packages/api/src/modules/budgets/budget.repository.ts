import mongoose from 'mongoose';
import { BudgetModel, type IBudget, type BudgetPeriod } from './budget.model.js';

export interface CreateBudgetDTO {
  userId: string;
  name: string;
  period: BudgetPeriod;
  startDate: Date;
  items: Array<{ categoryId: string; amount: number }>;
  rollover?: boolean;
}

export interface UpdateBudgetDTO {
  name?: string;
  period?: BudgetPeriod;
  startDate?: Date;
  items?: Array<{ categoryId: string; amount: number }>;
  rollover?: boolean;
}

export async function findByUser(userId: string): Promise<IBudget[]> {
  return BudgetModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .exec();
}

export async function findById(
  id: string,
  userId: string,
): Promise<IBudget | null> {
  return BudgetModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
}

export async function create(data: CreateBudgetDTO): Promise<IBudget> {
  const budget = new BudgetModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    name: data.name,
    period: data.period,
    startDate: data.startDate,
    items: data.items.map((item) => ({
      categoryId: new mongoose.Types.ObjectId(item.categoryId),
      amount: item.amount,
    })),
    rollover: data.rollover ?? false,
    isActive: true,
  });
  return budget.save();
}

export async function update(
  id: string,
  userId: string,
  data: Partial<UpdateBudgetDTO>,
): Promise<IBudget | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.name !== undefined) updatePayload['name'] = data.name;
  if (data.period !== undefined) updatePayload['period'] = data.period;
  if (data.startDate !== undefined) updatePayload['startDate'] = data.startDate;
  if (data.rollover !== undefined) updatePayload['rollover'] = data.rollover;
  if (data.items !== undefined) {
    updatePayload['items'] = data.items.map((item) => ({
      categoryId: new mongoose.Types.ObjectId(item.categoryId),
      amount: item.amount,
    }));
  }

  return BudgetModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

export async function deactivate(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await BudgetModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: { isActive: false } },
  ).exec();
  return result !== null;
}
