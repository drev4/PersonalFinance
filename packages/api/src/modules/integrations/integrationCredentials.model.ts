import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type IntegrationProvider = 'binance' | 'coinmarketcap' | 'finnhub';

export type SyncStatus = 'success' | 'error' | 'pending' | 'never';

export interface IIntegrationCredentials extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  provider: IntegrationProvider;
  encryptedPayload: string;
  iv: string;
  lastSyncAt?: Date;
  lastSyncStatus: SyncStatus;
  lastSyncError?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationCredentialsSchema = new Schema<IIntegrationCredentials>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['binance', 'coinmarketcap', 'finnhub'],
      required: true,
    },
    encryptedPayload: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    lastSyncAt: {
      type: Date,
    },
    lastSyncStatus: {
      type: String,
      enum: ['success', 'error', 'pending', 'never'],
      default: 'never',
    },
    lastSyncError: {
      type: String,
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

// One record per user per provider
IntegrationCredentialsSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const IntegrationCredentialsModel: Model<IIntegrationCredentials> =
  mongoose.model<IIntegrationCredentials>(
    'IntegrationCredentials',
    IntegrationCredentialsSchema,
  );
