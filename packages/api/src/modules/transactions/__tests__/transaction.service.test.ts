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

// ---- Imports after mocks ----------------------------------------------------
import { AccountModel } from '../../accounts/account.model.js';
import { TransactionModel } from '../transaction.model.js';
import { CategoryRuleModel } from '../categoryRule.model.js';
import {
  createTransaction,
  createTransfer,
  updateTransaction,
  deleteTransaction,
  getTransactions,
  bulkCreate,
  applyCategoryRule,
  TransactionError,
} from '../transaction.service.js';

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
  await TransactionModel.deleteMany({});
  await CategoryRuleModel.deleteMany({});
  vi.clearAllMocks();
});

// ---- Helpers -----------------------------------------------------------------

async function makeAccount(
  balance = 100000,
  currency = 'EUR',
  userId = FAKE_USER_ID,
) {
  const account = new AccountModel({
    userId: new mongoose.Types.ObjectId(userId),
    name: 'Test Account',
    type: 'checking',
    currency,
    currentBalance: balance,
    initialBalance: balance,
    isActive: true,
    includedInNetWorth: true,
  });
  return account.save();
}

async function freshBalance(accountId: string) {
  const doc = await AccountModel.findById(accountId).exec();
  return doc?.currentBalance ?? 0;
}

// =============================================================================
// createTransaction() — income
// =============================================================================

describe('createTransaction() — income', () => {
  it('increases account balance by amount', async () => {
    const account = await makeAccount(10000);
    await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'income',
      amount: 5000,
      currency: 'EUR',
      date: new Date(),
      description: 'Salary payment',
      source: 'manual',
    });

    const balance = await freshBalance(account._id.toHexString());
    expect(balance).toBe(15000);
  });

  it('persists the transaction with correct fields', async () => {
    const account = await makeAccount(0);
    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'income',
      amount: 200,
      currency: 'EUR',
      date: new Date('2024-01-15'),
      description: 'Freelance',
      source: 'manual',
    });

    expect(tx.type).toBe('income');
    expect(tx.amount).toBe(200);
    expect(tx.description).toBe('Freelance');
    expect(tx.userId.toHexString()).toBe(FAKE_USER_ID);
  });
});

// =============================================================================
// createTransaction() — expense
// =============================================================================

describe('createTransaction() — expense', () => {
  it('decreases account balance by amount', async () => {
    const account = await makeAccount(10000);
    await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'expense',
      amount: 3000,
      currency: 'EUR',
      date: new Date(),
      description: 'Groceries',
      source: 'manual',
    });

    const balance = await freshBalance(account._id.toHexString());
    expect(balance).toBe(7000);
  });

  it('allows balance to go negative (overdraft)', async () => {
    const account = await makeAccount(1000);
    await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'expense',
      amount: 5000,
      currency: 'EUR',
      date: new Date(),
      description: 'Big purchase',
      source: 'manual',
    });

    const balance = await freshBalance(account._id.toHexString());
    expect(balance).toBe(-4000);
  });
});

// =============================================================================
// createTransfer() — two linked transactions + balance changes
// =============================================================================

describe('createTransfer()', () => {
  it('creates 2 transactions and adjusts both account balances', async () => {
    const from = await makeAccount(50000);
    const to = await makeAccount(10000);

    const { from: fromTx, to: toTx } = await createTransfer(FAKE_USER_ID, {
      fromAccountId: from._id.toHexString(),
      toAccountId: to._id.toHexString(),
      amount: 20000,
      date: new Date(),
      description: 'Moving funds',
    });

    // Balances
    const fromBalance = await freshBalance(from._id.toHexString());
    const toBalance = await freshBalance(to._id.toHexString());
    expect(fromBalance).toBe(30000); // 50000 - 20000
    expect(toBalance).toBe(30000);  // 10000 + 20000

    // Transaction types
    expect(fromTx.type).toBe('transfer');
    expect(toTx.type).toBe('income');

    // Cross-references
    expect(fromTx.transferToAccountId?.toHexString()).toBe(to._id.toHexString());
    expect(toTx.transferToAccountId?.toHexString()).toBe(from._id.toHexString());
  });

  it('throws ACCOUNT_NOT_FOUND when source account does not exist', async () => {
    const to = await makeAccount(0);
    const fakeId = new mongoose.Types.ObjectId().toHexString();

    const error = await createTransfer(FAKE_USER_ID, {
      fromAccountId: fakeId,
      toAccountId: to._id.toHexString(),
      amount: 100,
      date: new Date(),
      description: 'Transfer',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TransactionError);
    expect((error as TransactionError).code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('throws SAME_ACCOUNT_TRANSFER when both accounts are identical', async () => {
    const account = await makeAccount(5000);

    const error = await createTransfer(FAKE_USER_ID, {
      fromAccountId: account._id.toHexString(),
      toAccountId: account._id.toHexString(),
      amount: 100,
      date: new Date(),
      description: 'Self transfer',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TransactionError);
    expect((error as TransactionError).code).toBe('SAME_ACCOUNT_TRANSFER');
  });

  it('does not create any transactions if source account is missing', async () => {
    const to = await makeAccount(0);
    const fakeId = new mongoose.Types.ObjectId().toHexString();

    await createTransfer(FAKE_USER_ID, {
      fromAccountId: fakeId,
      toAccountId: to._id.toHexString(),
      amount: 100,
      date: new Date(),
      description: 'Transfer',
    }).catch(() => undefined);

    const txCount = await TransactionModel.countDocuments({}).exec();
    expect(txCount).toBe(0);
  });
});

// =============================================================================
// deleteTransaction() — balance reversion
// =============================================================================

describe('deleteTransaction()', () => {
  it('reverts the balance when an income transaction is deleted', async () => {
    const account = await makeAccount(10000);
    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'income',
      amount: 5000,
      currency: 'EUR',
      date: new Date(),
      description: 'Salary',
      source: 'manual',
    });

    // balance is now 15000
    await deleteTransaction(FAKE_USER_ID, tx._id.toHexString());

    const balance = await freshBalance(account._id.toHexString());
    expect(balance).toBe(10000);
  });

  it('reverts the balance when an expense transaction is deleted', async () => {
    const account = await makeAccount(10000);
    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'expense',
      amount: 3000,
      currency: 'EUR',
      date: new Date(),
      description: 'Rent',
      source: 'manual',
    });

    // balance is now 7000
    await deleteTransaction(FAKE_USER_ID, tx._id.toHexString());

    const balance = await freshBalance(account._id.toHexString());
    expect(balance).toBe(10000);
  });

  it('removes the transaction from the database', async () => {
    const account = await makeAccount(5000);
    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'expense',
      amount: 500,
      currency: 'EUR',
      date: new Date(),
      description: 'Coffee',
      source: 'manual',
    });

    await deleteTransaction(FAKE_USER_ID, tx._id.toHexString());

    const found = await TransactionModel.findById(tx._id).exec();
    expect(found).toBeNull();
  });

  it('throws TRANSACTION_NOT_FOUND for a non-existent transaction', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await deleteTransaction(FAKE_USER_ID, fakeId).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(TransactionError);
    expect((error as TransactionError).code).toBe('TRANSACTION_NOT_FOUND');
  });

  it('cannot delete another user\'s transaction', async () => {
    const otherUser = new mongoose.Types.ObjectId().toHexString();
    const account = await makeAccount(5000, 'EUR', otherUser);
    const tx = await createTransaction(otherUser, {
      userId: otherUser,
      accountId: account._id.toHexString(),
      type: 'income',
      amount: 100,
      currency: 'EUR',
      date: new Date(),
      description: 'Test',
      source: 'manual',
    });

    const error = await deleteTransaction(FAKE_USER_ID, tx._id.toHexString()).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(TransactionError);
    expect((error as TransactionError).code).toBe('TRANSACTION_NOT_FOUND');
  });
});

// =============================================================================
// updateTransaction() — amount change recalculates balance
// =============================================================================

describe('updateTransaction()', () => {
  it('recalculates account balance when amount changes', async () => {
    const account = await makeAccount(10000);
    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'expense',
      amount: 2000,
      currency: 'EUR',
      date: new Date(),
      description: 'Lunch',
      source: 'manual',
    });
    // balance: 8000

    await updateTransaction(FAKE_USER_ID, tx._id.toHexString(), { amount: 3000 });
    // Revert 2000 → 10000, apply 3000 → 7000

    const balance = await freshBalance(account._id.toHexString());
    expect(balance).toBe(7000);
  });

  it('does not change balance when only description changes', async () => {
    const account = await makeAccount(5000);
    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'income',
      amount: 1000,
      currency: 'EUR',
      date: new Date(),
      description: 'Old description',
      source: 'manual',
    });
    // balance: 6000

    await updateTransaction(FAKE_USER_ID, tx._id.toHexString(), {
      description: 'New description',
    });

    const balance = await freshBalance(account._id.toHexString());
    expect(balance).toBe(6000);
  });

  it('updates the description field', async () => {
    const account = await makeAccount(0);
    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'income',
      amount: 100,
      currency: 'EUR',
      date: new Date(),
      description: 'Original',
      source: 'manual',
    });

    const updated = await updateTransaction(FAKE_USER_ID, tx._id.toHexString(), {
      description: 'Updated description',
    });
    expect(updated.description).toBe('Updated description');
  });
});

// =============================================================================
// Auto-categorization via category rules
// =============================================================================

describe('applyCategoryRule()', () => {
  it('returns null when no rules exist', async () => {
    const result = await applyCategoryRule('Grocery shopping', FAKE_USER_ID);
    expect(result).toBeNull();
  });

  it('matches description case-insensitively', async () => {
    const categoryId = new mongoose.Types.ObjectId();
    await CategoryRuleModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      categoryId,
      keywords: ['GROCERY'],
      priority: 1,
      isActive: true,
    });

    const result = await applyCategoryRule('grocery shopping', FAKE_USER_ID);
    expect(result).toBe(categoryId.toHexString());
  });

  it('returns the highest-priority matching rule', async () => {
    const lowCategory = new mongoose.Types.ObjectId();
    const highCategory = new mongoose.Types.ObjectId();

    await CategoryRuleModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      categoryId: lowCategory,
      keywords: ['food'],
      priority: 1,
      isActive: true,
    });
    await CategoryRuleModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      categoryId: highCategory,
      keywords: ['food'],
      priority: 10,
      isActive: true,
    });

    const result = await applyCategoryRule('food delivery', FAKE_USER_ID);
    expect(result).toBe(highCategory.toHexString());
  });

  it('skips inactive rules', async () => {
    const categoryId = new mongoose.Types.ObjectId();
    await CategoryRuleModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      categoryId,
      keywords: ['taxi'],
      priority: 5,
      isActive: false,
    });

    const result = await applyCategoryRule('Taxi ride', FAKE_USER_ID);
    expect(result).toBeNull();
  });

  it('auto-applies category when creating transaction without categoryId', async () => {
    const account = await makeAccount(10000);
    const categoryId = new mongoose.Types.ObjectId();

    await CategoryRuleModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      categoryId,
      keywords: ['supermarket'],
      priority: 5,
      isActive: true,
    });

    const tx = await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      type: 'expense',
      amount: 1500,
      currency: 'EUR',
      date: new Date(),
      description: 'Supermarket Lidl',
      source: 'manual',
    });

    expect(tx.categoryId?.toHexString()).toBe(categoryId.toHexString());
  });
});

// =============================================================================
// bulkCreate() — deduplication by externalId
// =============================================================================

describe('bulkCreate()', () => {
  it('inserts all transactions when there are no duplicates', async () => {
    const account = await makeAccount(0);

    const result = await bulkCreate(FAKE_USER_ID, [
      {
        userId: FAKE_USER_ID,
        accountId: account._id.toHexString(),
        type: 'income',
        amount: 100,
        currency: 'EUR',
        date: new Date(),
        description: 'Tx 1',
        source: 'csv_import',
        externalId: 'ext-001',
      },
      {
        userId: FAKE_USER_ID,
        accountId: account._id.toHexString(),
        type: 'income',
        amount: 200,
        currency: 'EUR',
        date: new Date(),
        description: 'Tx 2',
        source: 'csv_import',
        externalId: 'ext-002',
      },
    ]);

    expect(result.created).toBe(2);
    expect(result.duplicates).toBe(0);

    const count = await TransactionModel.countDocuments({}).exec();
    expect(count).toBe(2);
  });

  it('skips transactions with duplicate externalId', async () => {
    const account = await makeAccount(0);

    // First import
    await bulkCreate(FAKE_USER_ID, [
      {
        userId: FAKE_USER_ID,
        accountId: account._id.toHexString(),
        type: 'income',
        amount: 100,
        currency: 'EUR',
        date: new Date(),
        description: 'Tx 1',
        source: 'csv_import',
        externalId: 'ext-100',
      },
    ]);

    // Second import with same externalId + a new one
    const result = await bulkCreate(FAKE_USER_ID, [
      {
        userId: FAKE_USER_ID,
        accountId: account._id.toHexString(),
        type: 'income',
        amount: 100,
        currency: 'EUR',
        date: new Date(),
        description: 'Tx 1 (duplicate)',
        source: 'csv_import',
        externalId: 'ext-100',
      },
      {
        userId: FAKE_USER_ID,
        accountId: account._id.toHexString(),
        type: 'expense',
        amount: 50,
        currency: 'EUR',
        date: new Date(),
        description: 'Tx new',
        source: 'csv_import',
        externalId: 'ext-200',
      },
    ]);

    expect(result.created).toBe(1);
    expect(result.duplicates).toBe(1);

    const count = await TransactionModel.countDocuments({}).exec();
    expect(count).toBe(2); // original + the new one
  });

  it('inserts transactions without externalId regardless', async () => {
    const account = await makeAccount(0);

    const result = await bulkCreate(FAKE_USER_ID, [
      {
        userId: FAKE_USER_ID,
        accountId: account._id.toHexString(),
        type: 'income',
        amount: 99,
        currency: 'EUR',
        date: new Date(),
        description: 'No external ID',
        source: 'manual',
      },
      {
        userId: FAKE_USER_ID,
        accountId: account._id.toHexString(),
        type: 'income',
        amount: 88,
        currency: 'EUR',
        date: new Date(),
        description: 'Also no external ID',
        source: 'manual',
      },
    ]);

    expect(result.created).toBe(2);
    expect(result.duplicates).toBe(0);
  });

  it('returns 0 created and 0 duplicates for empty array', async () => {
    const result = await bulkCreate(FAKE_USER_ID, []);
    expect(result.created).toBe(0);
    expect(result.duplicates).toBe(0);
  });
});

// =============================================================================
// getTransactions() — filters and pagination
// =============================================================================

describe('getTransactions() — filters', () => {
  let accountId: string;

  beforeEach(async () => {
    const account = await makeAccount(100000);
    accountId = account._id.toHexString();
  });

  async function createTx(overrides: {
    type?: 'income' | 'expense';
    amount?: number;
    description?: string;
    date?: Date;
    tags?: string[];
  } = {}) {
    return createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId,
      type: overrides.type ?? 'income',
      amount: overrides.amount ?? 1000,
      currency: 'EUR',
      date: overrides.date ?? new Date(),
      description: overrides.description ?? 'Test',
      tags: overrides.tags,
      source: 'manual',
    });
  }

  it('returns all transactions without filters', async () => {
    await createTx();
    await createTx();
    await createTx();

    const result = await getTransactions(FAKE_USER_ID, {});
    expect(result.data).toHaveLength(3);
    expect(result.meta.total).toBe(3);
  });

  it('filters by type', async () => {
    await createTx({ type: 'income' });
    await createTx({ type: 'expense' });
    await createTx({ type: 'income' });

    const result = await getTransactions(FAKE_USER_ID, { type: 'income' });
    expect(result.data).toHaveLength(2);
    expect(result.data.every((t) => t.type === 'income')).toBe(true);
  });

  it('filters by date range', async () => {
    await createTx({ date: new Date('2024-01-01') });
    await createTx({ date: new Date('2024-06-15') });
    await createTx({ date: new Date('2024-12-31') });

    const result = await getTransactions(FAKE_USER_ID, {
      from: new Date('2024-05-01'),
      to: new Date('2024-07-31'),
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].description).toBe('Test');
  });

  it('filters by description search (case-insensitive)', async () => {
    await createTx({ description: 'Salary payment' });
    await createTx({ description: 'Grocery shopping' });
    await createTx({ description: 'SALARY bonus' });

    const result = await getTransactions(FAKE_USER_ID, { search: 'salary' });
    expect(result.data).toHaveLength(2);
  });

  it('filters by accountId', async () => {
    const otherAccount = await makeAccount(0);
    await createTx();
    await createTransaction(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: otherAccount._id.toHexString(),
      type: 'income',
      amount: 100,
      currency: 'EUR',
      date: new Date(),
      description: 'Other account tx',
      source: 'manual',
    });

    const result = await getTransactions(FAKE_USER_ID, { accountId });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].accountId.toHexString()).toBe(accountId);
  });

  it('paginates correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await createTx({ description: `Transaction ${i}` });
    }

    const page1 = await getTransactions(FAKE_USER_ID, { page: 1, limit: 2 });
    const page2 = await getTransactions(FAKE_USER_ID, { page: 2, limit: 2 });
    const page3 = await getTransactions(FAKE_USER_ID, { page: 3, limit: 2 });

    expect(page1.data).toHaveLength(2);
    expect(page2.data).toHaveLength(2);
    expect(page3.data).toHaveLength(1);
    expect(page1.meta.total).toBe(5);
    expect(page1.meta.totalPages).toBe(3);
  });

  it('only returns transactions belonging to the requesting user', async () => {
    const otherUser = new mongoose.Types.ObjectId().toHexString();
    const otherAccount = await makeAccount(0, 'EUR', otherUser);
    await createTransaction(otherUser, {
      userId: otherUser,
      accountId: otherAccount._id.toHexString(),
      type: 'income',
      amount: 999,
      currency: 'EUR',
      date: new Date(),
      description: 'Other user transaction',
      source: 'manual',
    });

    await createTx({ description: 'My transaction' });

    const result = await getTransactions(FAKE_USER_ID, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0].description).toBe('My transaction');
  });
});
