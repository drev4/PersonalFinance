import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ---- Mock Redis --------------------------------------------------------------
vi.mock('../../../config/redis.js', async () => {
  const { default: IORedisMock } = await import('ioredis-mock');
  const instance = new IORedisMock();
  return {
    getRedisClient: () => instance,
    createRedisClient: () => instance,
    closeRedisClient: async (): Promise<void> => undefined,
  };
});

// ---- Imports after mocks -----------------------------------------------------
import { NotificationModel } from '../notification.model.js';
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteRead,
} from '../notification.service.js';

// ---- Test setup --------------------------------------------------------------

let mongod: MongoMemoryServer;
const FAKE_USER_ID = new mongoose.Types.ObjectId().toHexString();
const OTHER_USER_ID = new mongoose.Types.ObjectId().toHexString();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await NotificationModel.deleteMany({});
  vi.clearAllMocks();
});

// ---- Helpers ----------------------------------------------------------------

async function makeNotification(
  userId = FAKE_USER_ID,
  overrides: {
    type?: 'budget_warning' | 'budget_exceeded' | 'recurring_due' | 'sync_error' | 'price_alert' | 'goal_reached' | 'report_ready';
    isRead?: boolean;
    title?: string;
  } = {},
) {
  const notif = await createNotification(userId, {
    type: overrides.type ?? 'budget_warning',
    title: overrides.title ?? 'Test notification',
    message: 'This is a test notification message',
    data: { budgetId: 'abc', categoryName: 'Food', percentage: 85 },
  });

  if (overrides.isRead === true) {
    await NotificationModel.findByIdAndUpdate(notif._id, { isRead: true }).exec();
  }

  return notif;
}

// =============================================================================
// createNotification()
// =============================================================================

describe('createNotification()', () => {
  it('creates a notification with correct defaults', async () => {
    const notif = await createNotification(FAKE_USER_ID, {
      type: 'budget_warning',
      title: 'Budget alert',
      message: 'You are at 85% of your budget',
    });

    expect(notif.userId.toHexString()).toBe(FAKE_USER_ID);
    expect(notif.type).toBe('budget_warning');
    expect(notif.title).toBe('Budget alert');
    expect(notif.message).toBe('You are at 85% of your budget');
    expect(notif.isRead).toBe(false);
    expect(notif.createdAt).toBeInstanceOf(Date);
  });

  it('stores optional data metadata', async () => {
    const notif = await createNotification(FAKE_USER_ID, {
      type: 'goal_reached',
      title: 'Goal!',
      message: 'You reached your goal',
      data: { goalId: 'xyz', goalName: 'Vacation', targetAmount: 500000 },
    });

    expect(notif.data).toMatchObject({
      goalId: 'xyz',
      goalName: 'Vacation',
      targetAmount: 500000,
    });
  });

  it('creates multiple notifications for the same user', async () => {
    await makeNotification();
    await makeNotification();
    await makeNotification();

    const result = await getUserNotifications(FAKE_USER_ID);
    expect(result.total).toBe(3);
  });

  it('stores all supported notification types', async () => {
    const types: Array<'budget_warning' | 'budget_exceeded' | 'recurring_due' | 'sync_error' | 'price_alert' | 'goal_reached' | 'report_ready'> = [
      'budget_warning',
      'budget_exceeded',
      'recurring_due',
      'sync_error',
      'price_alert',
      'goal_reached',
      'report_ready',
    ];

    for (const type of types) {
      const notif = await createNotification(FAKE_USER_ID, {
        type,
        title: `${type} title`,
        message: `${type} message`,
      });
      expect(notif.type).toBe(type);
    }
  });
});

// =============================================================================
// getUserNotifications() — pagination and unreadOnly filter
// =============================================================================

describe('getUserNotifications()', () => {
  it('returns notifications sorted by createdAt descending', async () => {
    // Create with small delay to get different createdAt values
    const n1 = await makeNotification();
    const n2 = await makeNotification();
    const n3 = await makeNotification();

    // Force different createdAt timestamps
    await NotificationModel.findByIdAndUpdate(n1._id, {
      createdAt: new Date('2026-01-01'),
    }).exec();
    await NotificationModel.findByIdAndUpdate(n2._id, {
      createdAt: new Date('2026-01-02'),
    }).exec();
    await NotificationModel.findByIdAndUpdate(n3._id, {
      createdAt: new Date('2026-01-03'),
    }).exec();

    const result = await getUserNotifications(FAKE_USER_ID);
    expect(result.data).toHaveLength(3);

    // n3 (most recent) should come first
    expect(result.data[0]._id.toHexString()).toBe(n3._id.toHexString());
    expect(result.data[2]._id.toHexString()).toBe(n1._id.toHexString());
  });

  it('paginates correctly', async () => {
    // Create 5 notifications
    for (let i = 0; i < 5; i++) {
      await makeNotification();
    }

    const page1 = await getUserNotifications(FAKE_USER_ID, { page: 1, limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(2);

    const page3 = await getUserNotifications(FAKE_USER_ID, { page: 3, limit: 2 });
    expect(page3.data).toHaveLength(1);
  });

  it('filters unread-only notifications', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: true });

    const result = await getUserNotifications(FAKE_USER_ID, { unreadOnly: true });
    expect(result.total).toBe(2);
    for (const notif of result.data) {
      expect(notif.isRead).toBe(false);
    }
  });

  it('returns all notifications when unreadOnly is false', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: true });

    const result = await getUserNotifications(FAKE_USER_ID, { unreadOnly: false });
    expect(result.total).toBe(2);
  });

  it('does not return notifications from other users', async () => {
    await makeNotification(FAKE_USER_ID);
    await makeNotification(OTHER_USER_ID);

    const result = await getUserNotifications(FAKE_USER_ID);
    expect(result.total).toBe(1);
    expect(result.data[0].userId.toHexString()).toBe(FAKE_USER_ID);
  });

  it('returns empty result when user has no notifications', async () => {
    const result = await getUserNotifications(FAKE_USER_ID);
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
    expect(result.totalPages).toBe(0);
  });
});

// =============================================================================
// markAsRead()
// =============================================================================

describe('markAsRead()', () => {
  it('marks specified notification as read', async () => {
    const notif = await makeNotification(FAKE_USER_ID, { isRead: false });
    expect(notif.isRead).toBe(false);

    await markAsRead(FAKE_USER_ID, [notif._id.toHexString()]);

    const updated = await NotificationModel.findById(notif._id).exec();
    expect(updated?.isRead).toBe(true);
  });

  it('marks multiple notifications as read in a single call', async () => {
    const n1 = await makeNotification(FAKE_USER_ID, { isRead: false });
    const n2 = await makeNotification(FAKE_USER_ID, { isRead: false });
    const n3 = await makeNotification(FAKE_USER_ID, { isRead: false });

    await markAsRead(FAKE_USER_ID, [
      n1._id.toHexString(),
      n2._id.toHexString(),
    ]);

    const updated1 = await NotificationModel.findById(n1._id).exec();
    const updated2 = await NotificationModel.findById(n2._id).exec();
    const updated3 = await NotificationModel.findById(n3._id).exec();

    expect(updated1?.isRead).toBe(true);
    expect(updated2?.isRead).toBe(true);
    expect(updated3?.isRead).toBe(false); // n3 untouched
  });

  it('does not mark notifications belonging to another user', async () => {
    const otherNotif = await makeNotification(OTHER_USER_ID, { isRead: false });

    // Try to mark it as read using FAKE_USER_ID
    await markAsRead(FAKE_USER_ID, [otherNotif._id.toHexString()]);

    const unchanged = await NotificationModel.findById(otherNotif._id).exec();
    expect(unchanged?.isRead).toBe(false);
  });

  it('is a no-op when given an empty array', async () => {
    const notif = await makeNotification(FAKE_USER_ID, { isRead: false });
    await markAsRead(FAKE_USER_ID, []); // should not throw

    const unchanged = await NotificationModel.findById(notif._id).exec();
    expect(unchanged?.isRead).toBe(false);
  });
});

// =============================================================================
// markAllAsRead()
// =============================================================================

describe('markAllAsRead()', () => {
  it('marks all unread notifications for the user as read', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: false });

    await markAllAsRead(FAKE_USER_ID);

    const unread = await NotificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      isRead: false,
    }).exec();

    expect(unread).toBe(0);
  });

  it('does not affect notifications of other users', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(OTHER_USER_ID, { isRead: false });

    await markAllAsRead(FAKE_USER_ID);

    const otherUnread = await NotificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(OTHER_USER_ID),
      isRead: false,
    }).exec();

    expect(otherUnread).toBe(1);
  });

  it('is idempotent when there are no unread notifications', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: true });
    await expect(markAllAsRead(FAKE_USER_ID)).resolves.toBeUndefined();
  });
});

// =============================================================================
// getUnreadCount()
// =============================================================================

describe('getUnreadCount()', () => {
  it('returns the correct count of unread notifications', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: true });

    const count = await getUnreadCount(FAKE_USER_ID);
    expect(count).toBe(2);
  });

  it('returns 0 when there are no unread notifications', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: true });
    const count = await getUnreadCount(FAKE_USER_ID);
    expect(count).toBe(0);
  });

  it('returns 0 for a user with no notifications at all', async () => {
    const count = await getUnreadCount(FAKE_USER_ID);
    expect(count).toBe(0);
  });

  it('does not count unread notifications from other users', async () => {
    await makeNotification(OTHER_USER_ID, { isRead: false });
    await makeNotification(OTHER_USER_ID, { isRead: false });

    const count = await getUnreadCount(FAKE_USER_ID);
    expect(count).toBe(0);
  });

  it('decreases after markAllAsRead', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: false });
    await makeNotification(FAKE_USER_ID, { isRead: false });

    expect(await getUnreadCount(FAKE_USER_ID)).toBe(2);
    await markAllAsRead(FAKE_USER_ID);
    expect(await getUnreadCount(FAKE_USER_ID)).toBe(0);
  });
});

// =============================================================================
// deleteRead()
// =============================================================================

describe('deleteRead()', () => {
  it('deletes only read notifications and returns count', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: true });
    await makeNotification(FAKE_USER_ID, { isRead: true });
    await makeNotification(FAKE_USER_ID, { isRead: false });

    const deleted = await deleteRead(FAKE_USER_ID);

    expect(deleted).toBe(2);

    const remaining = await NotificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    }).exec();
    expect(remaining).toBe(1);
  });

  it('returns 0 when there are no read notifications', async () => {
    await makeNotification(FAKE_USER_ID, { isRead: false });
    const deleted = await deleteRead(FAKE_USER_ID);
    expect(deleted).toBe(0);
  });

  it('does not delete notifications of other users', async () => {
    await makeNotification(OTHER_USER_ID, { isRead: true });

    const deleted = await deleteRead(FAKE_USER_ID);
    expect(deleted).toBe(0);

    const otherCount = await NotificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(OTHER_USER_ID),
    }).exec();
    expect(otherCount).toBe(1);
  });

  it('returns 0 when the user has no notifications at all', async () => {
    const deleted = await deleteRead(FAKE_USER_ID);
    expect(deleted).toBe(0);
  });
});
