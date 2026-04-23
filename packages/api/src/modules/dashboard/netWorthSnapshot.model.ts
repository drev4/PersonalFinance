import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface INetWorthBreakdown {
  cash: number;
  investments: number;
  realEstate: number;
  vehicles: number;
  debts: number;
}

export interface INetWorthSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  totalInBaseCurrency: number;
  breakdown: INetWorthBreakdown;
  createdAt: Date;
  updatedAt: Date;
}

const NetWorthBreakdownSchema = new Schema<INetWorthBreakdown>(
  {
    cash: { type: Number, required: true, default: 0 },
    investments: { type: Number, required: true, default: 0 },
    realEstate: { type: Number, required: true, default: 0 },
    vehicles: { type: Number, required: true, default: 0 },
    debts: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const NetWorthSnapshotSchema = new Schema<INetWorthSnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalInBaseCurrency: {
      type: Number,
      required: true,
      default: 0,
    },
    breakdown: {
      type: NetWorthBreakdownSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index: one snapshot per user per day, newest first
NetWorthSnapshotSchema.index({ userId: 1, date: -1 }, { unique: true });

export const NetWorthSnapshotModel: Model<INetWorthSnapshot> =
  mongoose.model<INetWorthSnapshot>('NetWorthSnapshot', NetWorthSnapshotSchema);
