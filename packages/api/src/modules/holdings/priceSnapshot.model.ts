import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type PriceSource = 'cmc' | 'binance' | 'finnhub';

export interface IPriceSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  symbol: string;
  price: number;
  currency: string;
  source: PriceSource;
  timestamp: Date;
}

const PriceSnapshotSchema = new Schema<IPriceSnapshot>(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    price: {
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
    source: {
      type: String,
      enum: ['cmc', 'binance', 'finnhub'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

// Compound index for symbol + time lookups (most recent first)
PriceSnapshotSchema.index({ symbol: 1, timestamp: -1 });

// TTL index: automatically remove snapshots older than 90 days
PriceSnapshotSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

export const PriceSnapshotModel: Model<IPriceSnapshot> = mongoose.model<IPriceSnapshot>(
  'PriceSnapshot',
  PriceSnapshotSchema,
);
