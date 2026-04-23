import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AssetType = 'crypto' | 'stock' | 'etf' | 'bond';
export type HoldingSource = 'manual' | 'binance' | 'csv_import';

export interface IHolding extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  assetType: AssetType;
  symbol: string;
  exchange?: string;
  quantity: string;
  averageBuyPrice: number;
  currency: string;
  currentPrice?: number;
  priceUpdatedAt?: Date;
  source: HoldingSource;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HoldingSchema = new Schema<IHolding>(
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
    assetType: {
      type: String,
      enum: ['crypto', 'stock', 'etf', 'bond'],
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    exchange: {
      type: String,
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: String,
      required: true,
    },
    averageBuyPrice: {
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
    currentPrice: {
      type: Number,
      min: 0,
    },
    priceUpdatedAt: {
      type: Date,
    },
    source: {
      type: String,
      enum: ['manual', 'binance', 'csv_import'],
      required: true,
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

// Compound index for user + symbol lookups
HoldingSchema.index({ userId: 1, symbol: 1 });

export const HoldingModel: Model<IHolding> = mongoose.model<IHolding>(
  'Holding',
  HoldingSchema,
);
