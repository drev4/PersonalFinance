import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit_card'
  | 'real_estate'
  | 'vehicle'
  | 'loan'
  | 'mortgage'
  | 'crypto'
  | 'investment'
  | 'other';

export interface IAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: number;
  initialBalance: number;
  institution?: string;
  notes?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  includedInNetWorth: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
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
      enum: [
        'checking',
        'savings',
        'cash',
        'credit_card',
        'real_estate',
        'vehicle',
        'loan',
        'mortgage',
        'crypto',
        'investment',
        'other',
      ],
      required: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    currentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    initialBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    institution: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    includedInNetWorth: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const AccountModel: Model<IAccount> = mongoose.model<IAccount>(
  'Account',
  AccountSchema,
);
