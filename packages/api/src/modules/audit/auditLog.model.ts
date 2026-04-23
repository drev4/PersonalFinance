import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AuditAction =
  | 'user.register'
  | 'user.login'
  | 'user.logout'
  | 'user.password_change'
  | 'user.password_reset_request'
  | 'user.password_reset'
  | 'user.email_verify'
  | 'user.profile_update'
  | 'user.2fa_enable'
  | 'user.2fa_disable'
  | 'integration_add'
  | 'integration_remove';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // TTL index: documents expire after 90 days (see SECURITY.md).
      // NOTE: If you change this value on an existing deployment, you must
      // drop the old `createdAt_1` index before Mongo will let the new one
      // build: `db.auditlogs.dropIndex('createdAt_1')` then restart the API
      // so `ensureIndexes()` creates the updated TTL.
      index: { expires: '90d' },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

export const AuditLogModel: Model<IAuditLog> = mongoose.model<IAuditLog>(
  'AuditLog',
  AuditLogSchema,
);
