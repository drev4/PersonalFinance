import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type DebtType =
  | 'credit_card'
  | 'personal_loan'
  | 'mortgage'
  | 'student_loan'
  | 'car_loan'
  | 'other';

export interface IDebt extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: DebtType;
  currency: string;
  originalAmount: number; // cents — total debt at creation
  currentBalance: number; // cents — amount still owed
  interestRate: number; // annual %, e.g. 12.5 for 12.5%
  minimumPayment: number; // cents per month
  nextPaymentDate?: Date;
  linkedAccountId?: mongoose.Types.ObjectId;
  color?: string;
  icon?: string;
  notes?: string;
  isPaidOff: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DebtSchema = new Schema<IDebt>(
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
    type: {
      type: String,
      enum: ['credit_card', 'personal_loan', 'mortgage', 'student_loan', 'car_loan', 'other'],
      required: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    currentBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minimumPayment: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    nextPaymentDate: {
      type: Date,
      default: undefined,
    },
    linkedAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      default: undefined,
    },
    color: {
      type: String,
      trim: true,
      default: undefined,
    },
    icon: {
      type: String,
      trim: true,
      default: undefined,
    },
    notes: {
      type: String,
      trim: true,
      default: undefined,
    },
    isPaidOff: {
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

DebtSchema.index({ userId: 1, isActive: 1, isPaidOff: 1 });
DebtSchema.index({ userId: 1, isPaidOff: 1, updatedAt: -1 });

export const DebtModel: Model<IDebt> = mongoose.model<IDebt>('Debt', DebtSchema);
