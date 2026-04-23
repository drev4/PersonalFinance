import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'recurring_due'
  | 'sync_error'
  | 'price_alert'
  | 'goal_reached'
  | 'report_ready';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'budget_warning',
        'budget_exceeded',
        'recurring_due',
        'sync_error',
        'price_alert',
        'goal_reached',
        'report_ready',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // We manage createdAt manually so we can set the TTL index on it;
    // updatedAt is not needed for notifications.
    timestamps: false,
    versionKey: false,
  },
);

// Compound index for efficient user-scoped queries with read-filter and ordering
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
// Supports filtering the notification inbox by a specific type.
NotificationSchema.index({ userId: 1, type: 1 });

// TTL index: MongoDB will automatically delete documents 90 days after createdAt
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const NotificationModel: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  NotificationSchema,
);
