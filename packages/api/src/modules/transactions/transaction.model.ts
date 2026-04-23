import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';
export type TransactionSource = 'manual' | 'binance' | 'csv_import' | 'adjustment';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IRecurring {
  frequency: RecurringFrequency;
  interval: number;
  nextDate: Date;
  endDate?: Date;
  parentId?: mongoose.Types.ObjectId;
}

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  categoryId?: mongoose.Types.ObjectId;
  tags: string[];
  transferToAccountId?: mongoose.Types.ObjectId;
  attachments?: string[];
  recurring?: IRecurring;
  source: TransactionSource;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringSchema = new Schema<IRecurring>(
  {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    interval: {
      type: Number,
      required: true,
      min: 1,
    },
    nextDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    parentId: {
      type: Schema.Types.ObjectId,
    },
  },
  { _id: false },
);

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer', 'adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: undefined,
    },
    tags: {
      type: [String],
      default: [],
    },
    transferToAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: undefined,
    },
    attachments: {
      type: [String],
      default: [],
    },
    recurring: {
      type: RecurringSchema,
      default: undefined,
    },
    source: {
      type: String,
      enum: ['manual', 'binance', 'csv_import', 'adjustment'],
      default: 'manual',
    },
    externalId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound indexes for efficient user-scoped queries
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
// Supports dashboard income/expense aggregations ordered by date desc.
TransactionSchema.index({ userId: 1, type: 1, date: -1 });
// Supports the recurring-transactions scheduler and upcoming-recurring queries.
TransactionSchema.index({ userId: 1, 'recurring.nextDate': 1 });

export const TransactionModel: Model<ITransaction> = mongoose.model<ITransaction>(
  'Transaction',
  TransactionSchema,
);
