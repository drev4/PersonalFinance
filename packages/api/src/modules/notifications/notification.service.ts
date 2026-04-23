import mongoose from 'mongoose';
import {
  NotificationModel,
  type INotification,
  type NotificationType,
} from './notification.model.js';

// ---- DTOs -------------------------------------------------------------------

export interface CreateNotificationDTO {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Error class ------------------------------------------------------------

export class NotificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

// ---- Service functions ------------------------------------------------------

/**
 * Creates a notification document in the database for the given user.
 */
export async function createNotification(
  userId: string,
  data: CreateNotificationDTO,
): Promise<INotification> {
  const notification = new NotificationModel({
    userId: new mongoose.Types.ObjectId(userId),
    type: data.type,
    title: data.title,
    message: data.message,
    data: data.data,
    isRead: false,
    createdAt: new Date(),
  });

  return notification.save();
}

/**
 * Returns a paginated list of notifications for the given user.
 * Optionally filtered to unread-only.
 */
export async function getUserNotifications(
  userId: string,
  options: { unreadOnly?: boolean; page?: number; limit?: number } = {},
): Promise<PaginatedResult<INotification>> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;

  const query: mongoose.FilterQuery<INotification> = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (options.unreadOnly === true) {
    query['isRead'] = false;
  }

  const [data, total] = await Promise.all([
    NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    NotificationModel.countDocuments(query).exec(),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Marks specific notifications as read.
 * Only updates notifications that belong to the given user.
 */
export async function markAsRead(
  userId: string,
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;

  const objectIds = notificationIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  await NotificationModel.updateMany(
    {
      _id: { $in: objectIds },
      userId: new mongoose.Types.ObjectId(userId),
    },
    { $set: { isRead: true } },
  ).exec();
}

/**
 * Marks all notifications for the given user as read.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await NotificationModel.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true } },
  ).exec();
}

/**
 * Returns the count of unread notifications for the navbar badge.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return NotificationModel.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    isRead: false,
  }).exec();
}

/**
 * Deletes all read notifications for the given user.
 * Returns the number of documents deleted.
 */
export async function deleteRead(userId: string): Promise<number> {
  const result = await NotificationModel.deleteMany({
    userId: new mongoose.Types.ObjectId(userId),
    isRead: true,
  }).exec();

  return result.deletedCount;
}
