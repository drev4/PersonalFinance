import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type IncomeType = 'dividend' | 'staking';

export interface IHoldingIncome extends Document {
  _id: mongoose.Types.ObjectId;
  holdingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: IncomeType;
  amount: number; // in cents
  currency: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HoldingIncomeSchema = new Schema<IHoldingIncome>(
  {
    holdingId: {
      type: Schema.Types.ObjectId,
      ref: 'Holding',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['dividend', 'staking'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
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
    notes: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

HoldingIncomeSchema.index({ userId: 1, date: -1 });

export const HoldingIncomeModel: Model<IHoldingIncome> = mongoose.model<IHoldingIncome>(
  'HoldingIncome',
  HoldingIncomeSchema,
);
