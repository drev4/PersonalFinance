import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ---- Mock Redis (not used by account service, but auth.service imports it) ---
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
import { AccountModel } from '../account.model.js';
import { TransactionModel } from '../../transactions/transaction.model.js';
import {
  createAccount,
  getUserAccounts,
  updateAccount,
  adjustBalance,
  archiveAccount,
  getNetWorth,
  AccountError,
} from '../account.service.js';

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
  vi.clearAllMocks();
});

// ---- Helpers -----------------------------------------------------------------

async function makeAccount(overrides: {
  name?: string;
  type?: 'checking' | 'savings' | 'cash';
  initialBalance?: number;
  currency?: string;
} = {}) {
  return createAccount(FAKE_USER_ID, {
    userId: FAKE_USER_ID,
    name: overrides.name ?? 'Test Account',
    type: overrides.type ?? 'checking',
    currency: overrides.currency ?? 'EUR',
    initialBalance: overrides.initialBalance ?? 10000,
  });
}

// =============================================================================
// createAccount()
// =============================================================================

describe('createAccount()', () => {
  it('creates an account with the given initial balance as currentBalance', async () => {
    const account = await makeAccount({ initialBalance: 50000 });

    expect(account.name).toBe('Test Account');
    expect(account.currentBalance).toBe(50000);
    expect(account.initialBalance).toBe(50000);
    expect(account.isActive).toBe(true);
    expect(account.userId.toHexString()).toBe(FAKE_USER_ID);
  });

  it('defaults includedInNetWorth to true', async () => {
    const account = await makeAccount();
    expect(account.includedInNetWorth).toBe(true);
  });

  it('stores currency as uppercase', async () => {
    const account = await makeAccount({ currency: 'usd' });
    // Model stores it; the service receives it as-is (Mongoose uppercase: true handles it)
    expect(account.currency).toBe('USD');
  });
});

// =============================================================================
// getUserAccounts()
// =============================================================================

describe('getUserAccounts()', () => {
  it('returns only active accounts for the given user', async () => {
    await makeAccount({ name: 'Checking' });
    await makeAccount({ name: 'Savings' });

    const accounts = await getUserAccounts(FAKE_USER_ID);
    expect(accounts).toHaveLength(2);
  });

  it('does not return archived accounts', async () => {
    const account = await makeAccount({ name: 'To Archive' });
    await archiveAccount(FAKE_USER_ID, account._id.toHexString());

    const accounts = await getUserAccounts(FAKE_USER_ID);
    expect(accounts).toHaveLength(0);
  });

  it('does not return accounts belonging to other users', async () => {
    const otherUserId = new mongoose.Types.ObjectId().toHexString();
    await createAccount(otherUserId, {
      userId: otherUserId,
      name: 'Other User Account',
      type: 'checking',
      currency: 'EUR',
      initialBalance: 0,
    });

    const accounts = await getUserAccounts(FAKE_USER_ID);
    expect(accounts).toHaveLength(0);
  });
});

// =============================================================================
// updateAccount()
// =============================================================================

describe('updateAccount()', () => {
  it('updates the account name', async () => {
    const account = await makeAccount({ name: 'Old Name' });
    const updated = await updateAccount(FAKE_USER_ID, account._id.toHexString(), {
      name: 'New Name',
    });
    expect(updated.name).toBe('New Name');
  });

  it('throws ACCOUNT_NOT_FOUND for a non-existent account', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await updateAccount(FAKE_USER_ID, fakeId, { name: 'X' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AccountError);
    expect((error as AccountError).code).toBe('ACCOUNT_NOT_FOUND');
    expect((error as AccountError).statusCode).toBe(404);
  });

  it('throws ACCOUNT_NOT_FOUND when updating another user\'s account', async () => {
    const otherUserId = new mongoose.Types.ObjectId().toHexString();
    const account = await createAccount(otherUserId, {
      userId: otherUserId,
      name: 'Other Account',
      type: 'checking',
      currency: 'EUR',
      initialBalance: 0,
    });

    const error = await updateAccount(
      FAKE_USER_ID,
      account._id.toHexString(),
      { name: 'Hacked' },
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountError);
    expect((error as AccountError).code).toBe('ACCOUNT_NOT_FOUND');
  });
});

// =============================================================================
// adjustBalance() — verifies adjustment transaction is created
// =============================================================================

describe('adjustBalance()', () => {
  it('updates the account currentBalance to the new value', async () => {
    const account = await makeAccount({ initialBalance: 10000 });
    const { account: updated } = await adjustBalance(
      FAKE_USER_ID,
      account._id.toHexString(),
      15000,
      'Manual correction',
    );
    expect(updated.currentBalance).toBe(15000);
  });

  it('creates an adjustment transaction with the diff amount', async () => {
    const account = await makeAccount({ initialBalance: 10000 });
    const { transaction } = await adjustBalance(
      FAKE_USER_ID,
      account._id.toHexString(),
      13000,
    );

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('adjustment');
    expect(transaction.amount).toBe(3000); // |13000 - 10000|
    expect(transaction.accountId.toHexString()).toBe(account._id.toHexString());
    expect(transaction.source).toBe('adjustment');
  });

  it('handles negative adjustment (balance decreases)', async () => {
    const account = await makeAccount({ initialBalance: 20000 });
    const { account: updated, transaction } = await adjustBalance(
      FAKE_USER_ID,
      account._id.toHexString(),
      15000,
    );
    expect(updated.currentBalance).toBe(15000);
    expect(transaction.amount).toBe(5000); // |15000 - 20000|
  });

  it('uses the provided note as the transaction description', async () => {
    const account = await makeAccount({ initialBalance: 0 });
    const { transaction } = await adjustBalance(
      FAKE_USER_ID,
      account._id.toHexString(),
      100,
      'Petty cash top-up',
    );
    expect(transaction.description).toBe('Petty cash top-up');
  });

  it('throws ACCOUNT_NOT_FOUND for a non-existent account', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await adjustBalance(FAKE_USER_ID, fakeId, 1000).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AccountError);
    expect((error as AccountError).code).toBe('ACCOUNT_NOT_FOUND');
  });
});

// =============================================================================
// archiveAccount()
// =============================================================================

describe('archiveAccount()', () => {
  it('soft-deletes the account (isActive becomes false)', async () => {
    const account = await makeAccount();
    await archiveAccount(FAKE_USER_ID, account._id.toHexString());

    const stored = await AccountModel.findById(account._id).exec();
    expect(stored?.isActive).toBe(false);
  });

  it('removes the account from getUserAccounts results', async () => {
    const account = await makeAccount({ name: 'To Remove' });
    await makeAccount({ name: 'To Keep' });

    await archiveAccount(FAKE_USER_ID, account._id.toHexString());

    const accounts = await getUserAccounts(FAKE_USER_ID);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe('To Keep');
  });

  it('throws ACCOUNT_NOT_FOUND for an unknown account', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await archiveAccount(FAKE_USER_ID, fakeId).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AccountError);
    expect((error as AccountError).code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('cannot archive another user\'s account', async () => {
    const otherUserId = new mongoose.Types.ObjectId().toHexString();
    const account = await createAccount(otherUserId, {
      userId: otherUserId,
      name: 'Other Account',
      type: 'savings',
      currency: 'USD',
      initialBalance: 5000,
    });

    const error = await archiveAccount(
      FAKE_USER_ID,
      account._id.toHexString(),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccountError);
  });
});

// =============================================================================
// getNetWorth()
// =============================================================================

describe('getNetWorth()', () => {
  it('returns 0 when user has no accounts', async () => {
    const summary = await getNetWorth(FAKE_USER_ID);
    expect(summary.totalBalance).toBe(0);
    expect(summary.byType).toEqual({});
  });

  it('sums balances across account types', async () => {
    await makeAccount({ type: 'checking', initialBalance: 10000 });
    await makeAccount({ type: 'savings', initialBalance: 20000 });

    const summary = await getNetWorth(FAKE_USER_ID);
    expect(summary.totalBalance).toBe(30000);
    expect(summary.byType['checking']).toBe(10000);
    expect(summary.byType['savings']).toBe(20000);
  });

  it('excludes archived accounts', async () => {
    const active = await makeAccount({ initialBalance: 5000 });
    const archived = await makeAccount({ initialBalance: 9000 });
    await archiveAccount(FAKE_USER_ID, archived._id.toHexString());

    const summary = await getNetWorth(FAKE_USER_ID);
    expect(summary.totalBalance).toBe(5000);
    // active account still included
    expect(active.isActive).toBe(true);
  });
});
