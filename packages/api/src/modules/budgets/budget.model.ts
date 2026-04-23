import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type BudgetPeriod = 'monthly' | 'yearly';

export interface IBudgetItem {
  categoryId: mongoose.Types.ObjectId;
  amount: number; // in cents, positive
}

export interface IBudget extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  period: BudgetPeriod;
  startDate: Date;
  items: IBudgetItem[];
  rollover: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetItemSchema = new Schema<IBudgetItem>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const BudgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    period: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    items: {
      type: [BudgetItemSchema],
      default: [],
    },
    rollover: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

BudgetSchema.index({ userId: 1, isActive: 1 });
// Supports period-based lookups ("budgets starting this month/year").
BudgetSchema.index({ userId: 1, startDate: 1 });

export const BudgetModel: Model<IBudget> = mongoose.model<IBudget>(
  'Budget',
  BudgetSchema,
);
