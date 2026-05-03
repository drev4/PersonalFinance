import mongoose from 'mongoose';
import {
  TransactionModel,
  type ITransaction,
  type TransactionType,
  type TransactionSource,
  type RecurringFrequency,
} from './transaction.model.js';
import { escapeRegex } from '../../utils/sanitize.js';

/** Upper bound on `limit` to protect against abusive list requests. */
const MAX_PAGE_SIZE = 100;

export interface TransactionFilters {
  from?: Date;
  to?: Date;
  categoryId?: string;
  accountId?: string;
  type?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface CreateTransactionDTO {
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  categoryId?: string;
  tags?: string[];
  transferToAccountId?: string;
  attachments?: string[];
  source?: TransactionSource;
  externalId?: string;
}

export interface UpdateTransactionDTO {
  amount?: number;
  currency?: string;
  date?: Date;
  description?: string;
  categoryId?: string;
  tags?: string[];
  attachments?: string[];
}

export interface CategorySpending {
  categoryId: string;
  total: number;
}

export interface CashflowData {
  month: string;
  income: number;
  expenses: number;
}

export async function findMany(
  userId: string,
  filters: TransactionFilters,
): Promise<{ data: ITransaction[]; total: number }> {
  const query: mongoose.FilterQuery<ITransaction> = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (filters.from !== undefined || filters.to !== undefined) {
    query['date'] = {};
    if (filters.from !== undefined) query['date']['$gte'] = filters.from;
    if (filters.to !== undefined) query['date']['$lte'] = filters.to;
  }

  if (filters.categoryId !== undefined) {
    query['categoryId'] = new mongoose.Types.ObjectId(filters.categoryId);
  }

  if (filters.accountId !== undefined) {
    query['accountId'] = new mongoose.Types.ObjectId(filters.accountId);
  }

  if (filters.type !== undefined) {
    query['type'] = filters.type;
  }

  if (filters.search !== undefined && filters.search.trim() !== '') {
    // Escape regex meta-characters — the user input is treated literally so
    // a malicious `.*` or a catastrophic-backtracking pattern cannot slip in.
    query['description'] = {
      $regex: escapeRegex(filters.search.trim()),
      $options: 'i',
    };
  }

  if (filters.tags !== undefined && filters.tags.length > 0) {
    query['tags'] = { $in: filters.tags };
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? 50));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    TransactionModel.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ITransaction[]>()
      .exec(),
    TransactionModel.countDocuments(query).exec(),
  ]);

  return { data, total };
}

export async function findById(
  id: string,
  userId: string,
): Promise<ITransaction | null> {
  return TransactionModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  })
    .lean<ITransaction>()
    .exec();
}

export async function create(
  data: CreateTransactionDTO,
  session?: mongoose.ClientSession,
): Promise<ITransaction> {
  const tx = new TransactionModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    accountId: new mongoose.Types.ObjectId(data.accountId),
    type: data.type,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
    description: data.description,
    categoryId:
      data.categoryId !== undefined
        ? new mongoose.Types.ObjectId(data.categoryId)
        : undefined,
    tags: data.tags ?? [],
    transferToAccountId:
      data.transferToAccountId !== undefined
        ? new mongoose.Types.ObjectId(data.transferToAccountId)
        : undefined,
    attachments: data.attachments ?? [],
    source: data.source ?? 'manual',
    externalId: data.externalId,
  });
  return tx.save({ session: session ?? undefined } as any);
}

export async function createMany(
  data: CreateTransactionDTO[],
): Promise<ITransaction[]> {
  const docs = data.map((d) => ({
    userId: new mongoose.Types.ObjectId(d.userId),
    accountId: new mongoose.Types.ObjectId(d.accountId),
    type: d.type,
    amount: d.amount,
    currency: d.currency,
    date: d.date,
    description: d.description,
    categoryId:
      d.categoryId !== undefined
        ? new mongoose.Types.ObjectId(d.categoryId)
        : undefined,
    tags: d.tags ?? [],
    transferToAccountId:
      d.transferToAccountId !== undefined
        ? new mongoose.Types.ObjectId(d.transferToAccountId)
        : undefined,
    attachments: d.attachments ?? [],
    source: d.source ?? 'manual',
    externalId: d.externalId,
  }));
  return TransactionModel.insertMany(docs) as unknown as ITransaction[];
}

export async function update(
  id: string,
  userId: string,
  data: Partial<UpdateTransactionDTO>,
): Promise<ITransaction | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.amount !== undefined) updatePayload['amount'] = data.amount;
  if (data.currency !== undefined) updatePayload['currency'] = data.currency;
  if (data.date !== undefined) updatePayload['date'] = data.date;
  if (data.description !== undefined) updatePayload['description'] = data.description;
  if (data.categoryId !== undefined) {
    updatePayload['categoryId'] = new mongoose.Types.ObjectId(data.categoryId);
  }
  if (data.tags !== undefined) updatePayload['tags'] = data.tags;
  if (data.attachments !== undefined) updatePayload['attachments'] = data.attachments;

  return TransactionModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    },
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

export async function hardDelete(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await TransactionModel.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).exec();
  return result !== null;
}

export async function getSpendingByCategory(
  userId: string,
  from: Date,
  to: Date,
): Promise<CategorySpending[]> {
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: from, $lte: to },
        categoryId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$categoryId',
        total: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        categoryId: { $toString: '$_id' },
        total: 1,
      },
    },
  ];

  return TransactionModel.aggregate<CategorySpending>(pipeline).exec();
}

export interface CreateRecurringTemplateDTO {
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  categoryId?: string;
  tags?: string[];
  frequency: RecurringFrequency;
  interval: number;
  nextDate: Date;
  endDate?: Date;
}

export async function createRecurringTemplate(
  data: CreateRecurringTemplateDTO,
): Promise<ITransaction> {
  const tx = new TransactionModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    accountId: new mongoose.Types.ObjectId(data.accountId),
    type: data.type,
    amount: data.amount,
    currency: data.currency,
    date: data.nextDate,
    description: data.description,
    categoryId: data.categoryId !== undefined
      ? new mongoose.Types.ObjectId(data.categoryId)
      : undefined,
    tags: data.tags ?? [],
    source: 'manual',
    recurring: {
      frequency: data.frequency,
      interval: data.interval,
      nextDate: data.nextDate,
      endDate: data.endDate,
    },
  });
  return tx.save();
}

export async function findRecurring(userId: string): Promise<ITransaction[]> {
  return TransactionModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    recurring: { $exists: true, $ne: null },
  })
    .sort({ 'recurring.nextDate': 1 })
    .lean<ITransaction[]>()
    .exec();
}

export async function removeRecurring(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await TransactionModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      recurring: { $exists: true },
    },
    { $unset: { recurring: 1 } },
  ).exec();
  return result !== null;
}

export async function updateRecurring(
  id: string,
  userId: string,
  data: {
    frequency?: RecurringFrequency;
    interval?: number;
    nextDate?: Date;
    endDate?: Date;
  },
): Promise<ITransaction | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.frequency !== undefined) updatePayload['recurring.frequency'] = data.frequency;
  if (data.interval !== undefined) updatePayload['recurring.interval'] = data.interval;
  if (data.nextDate !== undefined) updatePayload['recurring.nextDate'] = data.nextDate;
  if (data.endDate !== undefined) updatePayload['recurring.endDate'] = data.endDate;

  return TransactionModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      recurring: { $exists: true },
    },
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

export async function getCashflow(
  userId: string,
  months: number,
): Promise<CashflowData[]> {
  const from = new Date();
  from.setMonth(from.getMonth() - months + 1);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: { $in: ['income', 'expense'] },
        date: { $gte: from },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
    {
      $group: {
        _id: { year: '$_id.year', month: '$_id.month' },
        entries: {
          $push: { type: '$_id.type', total: '$total' },
        },
      },
    },
    {
      $sort: { '_id.year': 1 as const, '_id.month': 1 as const },
    },
  ];

  const results = await TransactionModel.aggregate<{
    _id: { year: number; month: number };
    entries: Array<{ type: string; total: number }>;
  }>(pipeline).exec();

  return results.map((r) => {
    const income = r.entries.find((e) => e.type === 'income')?.total ?? 0;
    const expenses = r.entries.find((e) => e.type === 'expense')?.total ?? 0;
    const month = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
    return { month, income, expenses };
  });
}
