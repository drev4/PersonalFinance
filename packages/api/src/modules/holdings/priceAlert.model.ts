import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IPriceAlert extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  holdingId: mongoose.Types.ObjectId;
  symbol: string;
  assetType: string;
  condition: 'above' | 'below';
  targetPrice: number; // cents
  currency: string;
  isActive: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PriceAlertSchema = new Schema<IPriceAlert>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    holdingId: { type: Schema.Types.ObjectId, ref: 'Holding', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    assetType: { type: String, required: true },
    condition: { type: String, enum: ['above', 'below'], required: true },
    targetPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'EUR' },
    isActive: { type: Boolean, default: true, index: true },
    triggeredAt: { type: Date },
  },
  { timestamps: true },
);

PriceAlertSchema.index({ isActive: 1, symbol: 1 });

export const PriceAlertModel: Model<IPriceAlert> = mongoose.model('PriceAlert', PriceAlertSchema);
