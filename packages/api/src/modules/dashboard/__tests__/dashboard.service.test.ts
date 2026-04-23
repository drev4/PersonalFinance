import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ---- Mock Redis (net-worth caching lives behind this) -----------------------
// A single shared ioredis-mock instance keeps cache semantics consistent with
// production. `beforeEach` flushes the DB so a previous test's cache doesn't
// leak across assertions.
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
import { AccountModel } from '../../accounts/account.model.js';
import { CategoryModel } from '../../categories/category.model.js';
import { TransactionModel } from '../../transactions/transaction.model.js';
import { NetWorthSnapshotModel } from '../netWorthSnapshot.model.js';
import {
  getNetWorth,
  getNetWorthHistory,
  getSpendingByCategory,
  takeNetWorthSnapshot,
  getCashflow,
  type NetWorthPeriod,
} from '../dashboard.service.js';
import { getRedisClient } from '../../../config/redis.js';

// ---- Test setup --------------------------------------------------------------

let mongod: MongoMemoryServer;

const FAKE_USER_ID = new mongoose.Types.ObjectId().toHexString();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await AccountModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await TransactionModel.deleteMany({});
  await NetWorthSnapshotModel.deleteMany({});
  // Clear Redis mock so the net-worth cache from a previous test doesn't leak.
  await getRedisClient().flushall();
  vi.clearAllMocks();
});

// ---- Helpers -----------------------------------------------------------------

async function makeAccount(overrides: {
  type?: string;
  currentBalance?: number;
  includedInNetWorth?: boolean;
  isActive?: boolean;
} = {}) {
  return AccountModel.create({
    userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    name: 'Test Account',
    type: overrides.type ?? 'checking',
    currency: 'EUR',
    currentBalance: overrides.currentBalance ?? 0,
    initialBalance: overrides.currentBalance ?? 0,
    isActive: overrides.isActive ?? true,
    includedInNetWorth: overrides.includedInNetWorth ?? true,
  });
}

async function makeCategory(overrides: {
  name?: string;
  color?: string;
  icon?: string;
} = {}) {
  return CategoryModel.create({
    userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    name: overrides.name ?? 'Food',
    type: 'expense',
    color: overrides.color ?? '#FF5733',
    icon: overrides.icon ?? 'utensils',
    isDefault: false,
    isActive: true,
  });
}

async function makeTransaction(overrides: {
  type?: string;
  amount?: number;
  date?: Date;
  categoryId?: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
}) {
  const accountId =
    overrides.accountId ??
    (await makeAccount()).id as mongoose.Types.ObjectId;

  return TransactionModel.create({
    userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    accountId,
    type: overrides.type ?? 'expense',
    amount: overrides.amount ?? 1000,
    currency: 'EUR',
    date: overrides.date ?? new Date(),
    description: 'Test transaction',
    categoryId: overrides.categoryId,
    tags: [],
    source: 'manual',
  });
}

// =============================================================================
// getNetWorth()
// =============================================================================

describe('getNetWorth()', () => {
  it('returns zero total when the user has no accounts', async () => {
    const result = await getNetWorth(FAKE_USER_ID);

    expect(result.total).toBe(0);
    expect(result.assets).toBe(0);
    expect(result.liabilities).toBe(0);
    expect(result.breakdown).toEqual({
      cash: 0,
      investments: 0,
      realEstate: 0,
      vehicles: 0,
      debts: 0,
    });
  });

  it('aggregates asset accounts correctly', async () => {
    await makeAccount({ type: 'checking', currentBalance: 100_000 });
    await makeAccount({ type: 'savings', currentBalance: 50_000 });
    await makeAccount({ type: 'investment', currentBalance: 200_000 });

    const result = await getNetWorth(FAKE_USER_ID);

    expect(result.assets).toBe(350_000);
    expect(result.liabilities).toBe(0);
    expect(result.total).toBe(350_000);
    expect(result.breakdown.cash).toBe(150_000);
    expect(result.breakdown.investments).toBe(200_000);
  });

  it('aggregates liability accounts correctly', async () => {
    await makeAccount({ type: 'loan', currentBalance: 30_000 });
    await makeAccount({ type: 'credit_card', currentBalance: 5_000 });

    const result = await getNetWorth(FAKE_USER_ID);

    expect(result.liabilities).toBe(35_000);
    expect(result.assets).toBe(0);
    expect(result.total).toBe(-35_000);
    expect(result.breakdown.debts).toBe(35_000);
  });

  it('computes total as assets minus liabilities', async () => {
    await makeAccount({ type: 'checking', currentBalance: 80_000 });
    await makeAccount({ type: 'savings', currentBalance: 20_000 });
    await makeAccount({ type: 'mortgage', currentBalance: 60_000 });

    const result = await getNetWorth(FAKE_USER_ID);

    expect(result.assets).toBe(100_000);
    expect(result.liabilities).toBe(60_000);
    expect(result.total).toBe(40_000);
  });

  it('excludes accounts with includedInNetWorth = false', async () => {
    await makeAccount({ type: 'checking', currentBalance: 50_000, includedInNetWorth: true });
    await makeAccount({ type: 'savings', currentBalance: 10_000, includedInNetWorth: false });

    const result = await getNetWorth(FAKE_USER_ID);

    expect(result.assets).toBe(50_000);
  });

  it('excludes archived accounts', async () => {
    await makeAccount({ type: 'checking', currentBalance: 50_000, isActive: true });
    await makeAccount({ type: 'savings', currentBalance: 10_000, isActive: false });

    const result = await getNetWorth(FAKE_USER_ID);

    expect(result.assets).toBe(50_000);
  });

  it('classifies all account types into the correct breakdown bucket', async () => {
    await makeAccount({ type: 'cash', currentBalance: 1_000 });
    await makeAccount({ type: 'crypto', currentBalance: 5_000 });
    await makeAccount({ type: 'real_estate', currentBalance: 300_000 });
    await makeAccount({ type: 'vehicle', currentBalance: 20_000 });

    const result = await getNetWorth(FAKE_USER_ID);

    expect(result.breakdown.cash).toBe(1_000);
    expect(result.breakdown.investments).toBe(5_000);
    expect(result.breakdown.realEstate).toBe(300_000);
    expect(result.breakdown.vehicles).toBe(20_000);
  });
});

// =============================================================================
// getNetWorthHistory()
// =============================================================================

describe('getNetWorthHistory()', () => {
  it('returns empty array when no snapshots exist', async () => {
    const result = await getNetWorthHistory(FAKE_USER_ID, '1y');
    expect(result).toEqual([]);
  });

  it('returns snapshots ordered by date ascending', async () => {
    const userId = new mongoose.Types.ObjectId(FAKE_USER_ID);
    const breakdown = { cash: 0, investments: 0, realEstate: 0, vehicles: 0, debts: 0 };

    await NetWorthSnapshotModel.create([
      { userId, date: new Date('2026-03-01T00:00:00Z'), totalInBaseCurrency: 30_000, breakdown },
      { userId, date: new Date('2026-01-01T00:00:00Z'), totalInBaseCurrency: 10_000, breakdown },
      { userId, date: new Date('2026-02-01T00:00:00Z'), totalInBaseCurrency: 20_000, breakdown },
    ]);

    const result = await getNetWorthHistory(FAKE_USER_ID, 'all');

    expect(result).toHaveLength(3);
    expect(result[0].total).toBe(10_000);
    expect(result[1].total).toBe(20_000);
    expect(result[2].total).toBe(30_000);
  });

  it('filters snapshots to the given period', async () => {
    const userId = new mongoose.Types.ObjectId(FAKE_USER_ID);
    const breakdown = { cash: 0, investments: 0, realEstate: 0, vehicles: 0, debts: 0 };
    const now = new Date();

    // One snapshot well outside 1m range
    const old = new Date(now);
    old.setMonth(old.getMonth() - 6);

    // One snapshot inside 1m range
    const recent = new Date(now);
    recent.setDate(recent.getDate() - 10);

    await NetWorthSnapshotModel.create([
      { userId, date: old, totalInBaseCurrency: 5_000, breakdown },
      { userId, date: recent, totalInBaseCurrency: 15_000, breakdown },
    ]);

    const result = await getNetWorthHistory(FAKE_USER_ID, '1m');

    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(15_000);
  });

  it('returns all snapshots for period "all" without date filtering', async () => {
    const userId = new mongoose.Types.ObjectId(FAKE_USER_ID);
    const breakdown = { cash: 0, investments: 0, realEstate: 0, vehicles: 0, debts: 0 };

    const dates = ['2024-01-01', '2025-01-01', '2026-01-01'];
    await NetWorthSnapshotModel.create(
      dates.map((d, i) => ({
        userId,
        date: new Date(`${d}T00:00:00Z`),
        totalInBaseCurrency: (i + 1) * 10_000,
        breakdown,
      })),
    );

    const result = await getNetWorthHistory(FAKE_USER_ID, 'all' as NetWorthPeriod);
    expect(result).toHaveLength(3);
  });
});

// =============================================================================
// getSpendingByCategory()
// =============================================================================

describe('getSpendingByCategory()', () => {
  it('returns empty array when there are no expense transactions', async () => {
    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-04-30T23:59:59Z');
    const result = await getSpendingByCategory(FAKE_USER_ID, from, to);
    expect(result).toEqual([]);
  });

  it('aggregates spending per category and enriches with category metadata', async () => {
    const cat = await makeCategory({ name: 'Food', color: '#FF5733', icon: 'fork' });
    const account = await makeAccount({ type: 'checking', currentBalance: 100_000 });

    const txDate = new Date('2026-04-10T12:00:00Z');

    await makeTransaction({
      type: 'expense',
      amount: 5_000,
      date: txDate,
      categoryId: cat._id,
      accountId: account._id,
    });
    await makeTransaction({
      type: 'expense',
      amount: 3_000,
      date: txDate,
      categoryId: cat._id,
      accountId: account._id,
    });

    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-04-30T23:59:59Z');
    const result = await getSpendingByCategory(FAKE_USER_ID, from, to);

    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe(cat._id.toHexString());
    expect(result[0].name).toBe('Food');
    expect(result[0].color).toBe('#FF5733');
    expect(result[0].icon).toBe('fork');
    expect(result[0].total).toBe(8_000);
    expect(result[0].percentage).toBe(100);
  });

  it('returns results sorted by total descending', async () => {
    const catA = await makeCategory({ name: 'Transport' });
    const catB = await makeCategory({ name: 'Entertainment' });
    const account = await makeAccount({ type: 'checking', currentBalance: 100_000 });
    const txDate = new Date('2026-04-15T00:00:00Z');

    await makeTransaction({ type: 'expense', amount: 2_000, date: txDate, categoryId: catA._id, accountId: account._id });
    await makeTransaction({ type: 'expense', amount: 9_000, date: txDate, categoryId: catB._id, accountId: account._id });

    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-04-30T23:59:59Z');
    const result = await getSpendingByCategory(FAKE_USER_ID, from, to);

    expect(result[0].name).toBe('Entertainment');
    expect(result[1].name).toBe('Transport');
  });

  it('calculates percentage correctly across multiple categories', async () => {
    const catA = await makeCategory({ name: 'Food' });
    const catB = await makeCategory({ name: 'Rent' });
    const account = await makeAccount({ type: 'checking', currentBalance: 500_000 });
    const txDate = new Date('2026-04-10T00:00:00Z');

    // 25% and 75%
    await makeTransaction({ type: 'expense', amount: 25_000, date: txDate, categoryId: catA._id, accountId: account._id });
    await makeTransaction({ type: 'expense', amount: 75_000, date: txDate, categoryId: catB._id, accountId: account._id });

    const from = new Date('2026-04-01T00:00:00Z');
    const to = new Date('2026-04-30T23:59:59Z');
    const result = await getSpendingByCategory(FAKE_USER_ID, from, to);

    const rent = result.find((r) => r.name === 'Rent');
    const food = result.find((r) => r.name === 'Food');

    expect(rent?.percentage).toBe(75);
    expect(food?.percentage).toBe(25);
  });
});

// =============================================================================
// takeNetWorthSnapshot()
// =============================================================================

describe('takeNetWorthSnapshot()', () => {
  it('creates a snapshot with the correct net worth values', async () => {
    await makeAccount({ type: 'checking', currentBalance: 100_000 });
    await makeAccount({ type: 'loan', currentBalance: 40_000 });

    await takeNetWorthSnapshot(FAKE_USER_ID);

    const snapshots = await NetWorthSnapshotModel.find({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    }).lean().exec();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].totalInBaseCurrency).toBe(60_000); // 100k - 40k
    expect(snapshots[0].breakdown.cash).toBe(100_000);
    expect(snapshots[0].breakdown.debts).toBe(40_000);
  });

  it('normalizes the snapshot date to midnight UTC', async () => {
    await makeAccount({ type: 'savings', currentBalance: 10_000 });

    await takeNetWorthSnapshot(FAKE_USER_ID);

    const snapshot = await NetWorthSnapshotModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    }).lean().exec();

    const date = snapshot?.date as Date;
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
    expect(date.getUTCMilliseconds()).toBe(0);
  });

  it('does not create a duplicate when called twice on the same day', async () => {
    await makeAccount({ type: 'checking', currentBalance: 50_000 });

    await takeNetWorthSnapshot(FAKE_USER_ID);
    await takeNetWorthSnapshot(FAKE_USER_ID);

    const count = await NetWorthSnapshotModel.countDocuments({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    }).exec();

    expect(count).toBe(1);
  });

  it('updates the existing snapshot on upsert (second call wins)', async () => {
    await makeAccount({ type: 'checking', currentBalance: 50_000 });
    await takeNetWorthSnapshot(FAKE_USER_ID);

    // Simulate balance change
    await AccountModel.updateOne(
      { userId: new mongoose.Types.ObjectId(FAKE_USER_ID) },
      { $set: { currentBalance: 80_000 } },
    ).exec();

    await takeNetWorthSnapshot(FAKE_USER_ID);

    const snapshots = await NetWorthSnapshotModel.find({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    }).lean().exec();

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].totalInBaseCurrency).toBe(80_000);
  });
});

// =============================================================================
// getCashflow()
// =============================================================================

describe('getCashflow()', () => {
  it('returns an empty array when there are no transactions', async () => {
    const result = await getCashflow(FAKE_USER_ID, 3);
    expect(result).toEqual([]);
  });

  it('includes a net field equal to income minus expenses', async () => {
    const account = await makeAccount({ type: 'checking', currentBalance: 200_000 });
    const now = new Date();

    await TransactionModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      accountId: account._id,
      type: 'income',
      amount: 100_000,
      currency: 'EUR',
      date: now,
      description: 'Salary',
      tags: [],
      source: 'manual',
    });

    await TransactionModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      accountId: account._id,
      type: 'expense',
      amount: 30_000,
      currency: 'EUR',
      date: now,
      description: 'Rent',
      tags: [],
      source: 'manual',
    });

    const result = await getCashflow(FAKE_USER_ID, 1);

    expect(result).toHaveLength(1);
    expect(result[0].income).toBe(100_000);
    expect(result[0].expenses).toBe(30_000);
    expect(result[0].net).toBe(70_000);
  });
});
