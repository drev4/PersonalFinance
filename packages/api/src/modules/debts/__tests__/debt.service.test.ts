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
import { DebtModel } from '../debt.model.js';
import {
  getUserDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  getDebt,
  makePayment,
  calculateDebtInfo,
  DebtError,
} from '../debt.service.js';
import type { IDebt } from '../debt.model.js';

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
  await DebtModel.deleteMany({});
  vi.clearAllMocks();
});

// ---- Helpers ----------------------------------------------------------------

async function makeDebt(
  overrides: {
    name?: string;
    type?: IDebt['type'];
    originalAmount?: number;
    currentBalance?: number;
    interestRate?: number;
    minimumPayment?: number;
  } = {},
) {
  return createDebt(FAKE_USER_ID, {
    userId: FAKE_USER_ID,
    name: overrides.name ?? 'Tarjeta BBVA',
    type: overrides.type ?? 'credit_card',
    currency: 'EUR',
    originalAmount: overrides.originalAmount ?? 500000,
    currentBalance: overrides.currentBalance ?? 500000,
    interestRate: overrides.interestRate ?? 20,
    minimumPayment: overrides.minimumPayment ?? 15000,
  });
}

// =============================================================================
// createDebt()
// =============================================================================

describe('createDebt()', () => {
  it('creates a debt with correct defaults', async () => {
    const debt = await makeDebt();

    expect(debt.name).toBe('Tarjeta BBVA');
    expect(debt.type).toBe('credit_card');
    expect(debt.originalAmount).toBe(500000);
    expect(debt.currentBalance).toBe(500000);
    expect(debt.interestRate).toBe(20);
    expect(debt.isPaidOff).toBe(false);
    expect(debt.isActive).toBe(true);
    expect(debt.userId.toHexString()).toBe(FAKE_USER_ID);
  });

  it('creates multiple debts for the same user', async () => {
    await makeDebt({ name: 'Tarjeta A' });
    await makeDebt({ name: 'Hipoteca' });

    const debts = await getUserDebts(FAKE_USER_ID);
    expect(debts).toHaveLength(2);
  });
});

// =============================================================================
// getUserDebts()
// =============================================================================

describe('getUserDebts()', () => {
  it('returns active unpaid debts', async () => {
    await makeDebt({ name: 'Debt A' });
    await makeDebt({ name: 'Debt B' });

    const debts = await getUserDebts(FAKE_USER_ID);
    expect(debts).toHaveLength(2);
  });

  it('includes paid-off debts from the last 30 days', async () => {
    const debt = await makeDebt();
    await DebtModel.findByIdAndUpdate(debt._id, { isPaidOff: true, currentBalance: 0 }).exec();

    const debts = await getUserDebts(FAKE_USER_ID);
    expect(debts).toHaveLength(1);
    expect(debts[0].isPaidOff).toBe(true);
  });

  it('excludes soft-deleted debts', async () => {
    const debt = await makeDebt();
    await deleteDebt(FAKE_USER_ID, debt._id.toHexString());

    const debts = await getUserDebts(FAKE_USER_ID);
    expect(debts).toHaveLength(0);
  });
});

// =============================================================================
// getDebt()
// =============================================================================

describe('getDebt()', () => {
  it('returns the debt by id', async () => {
    const created = await makeDebt({ name: 'Hipoteca' });
    const fetched = await getDebt(FAKE_USER_ID, created._id.toHexString());
    expect(fetched._id.toHexString()).toBe(created._id.toHexString());
    expect(fetched.name).toBe('Hipoteca');
  });

  it('throws DEBT_NOT_FOUND for a non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await getDebt(FAKE_USER_ID, fakeId).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DebtError);
    expect((error as DebtError).code).toBe('DEBT_NOT_FOUND');
    expect((error as DebtError).statusCode).toBe(404);
  });
});

// =============================================================================
// updateDebt()
// =============================================================================

describe('updateDebt()', () => {
  it('updates name and interestRate', async () => {
    const debt = await makeDebt({ name: 'Old Name' });
    const updated = await updateDebt(FAKE_USER_ID, debt._id.toHexString(), {
      name: 'New Name',
      interestRate: 15,
    });
    expect(updated.name).toBe('New Name');
    expect(updated.interestRate).toBe(15);
  });

  it('auto-marks isPaidOff when currentBalance is set to 0', async () => {
    const debt = await makeDebt({ currentBalance: 100000 });
    const updated = await updateDebt(FAKE_USER_ID, debt._id.toHexString(), {
      currentBalance: 0,
    });
    expect(updated.isPaidOff).toBe(true);
    expect(updated.currentBalance).toBe(0);
  });

  it('does not mark isPaidOff when currentBalance is still positive', async () => {
    const debt = await makeDebt({ currentBalance: 100000 });
    const updated = await updateDebt(FAKE_USER_ID, debt._id.toHexString(), {
      currentBalance: 50000,
    });
    expect(updated.isPaidOff).toBe(false);
  });

  it('throws DEBT_NOT_FOUND for non-existent debt', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await updateDebt(FAKE_USER_ID, fakeId, { name: 'X' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DebtError);
    expect((error as DebtError).code).toBe('DEBT_NOT_FOUND');
  });
});

// =============================================================================
// makePayment()
// =============================================================================

describe('makePayment()', () => {
  it('reduces currentBalance by the payment amount', async () => {
    const debt = await makeDebt({ currentBalance: 500000 });
    const updated = await makePayment(FAKE_USER_ID, debt._id.toHexString(), 100000);
    expect(updated.currentBalance).toBe(400000);
    expect(updated.isPaidOff).toBe(false);
  });

  it('marks isPaidOff when payment covers full balance', async () => {
    const debt = await makeDebt({ currentBalance: 100000 });
    const updated = await makePayment(FAKE_USER_ID, debt._id.toHexString(), 100000);
    expect(updated.currentBalance).toBe(0);
    expect(updated.isPaidOff).toBe(true);
  });

  it('clamps balance to 0 when overpayment occurs', async () => {
    const debt = await makeDebt({ currentBalance: 50000 });
    const updated = await makePayment(FAKE_USER_ID, debt._id.toHexString(), 200000);
    expect(updated.currentBalance).toBe(0);
    expect(updated.isPaidOff).toBe(true);
  });

  it('throws INVALID_AMOUNT for non-positive amounts', async () => {
    const debt = await makeDebt();
    const error = await makePayment(FAKE_USER_ID, debt._id.toHexString(), 0).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(DebtError);
    expect((error as DebtError).code).toBe('INVALID_AMOUNT');
  });

  it('throws DEBT_PAID_OFF when trying to pay an already paid debt', async () => {
    const debt = await makeDebt({ currentBalance: 0 });
    await DebtModel.findByIdAndUpdate(debt._id, { isPaidOff: true }).exec();
    const error = await makePayment(FAKE_USER_ID, debt._id.toHexString(), 1000).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(DebtError);
    expect((error as DebtError).code).toBe('DEBT_PAID_OFF');
  });
});

// =============================================================================
// calculateDebtInfo()
// =============================================================================

describe('calculateDebtInfo()', () => {
  function buildDebt(overrides: Partial<IDebt>): IDebt {
    return {
      originalAmount: 500000,
      currentBalance: 500000,
      interestRate: 20,
      minimumPayment: 15000,
      isPaidOff: false,
      isActive: true,
      ...overrides,
    } as unknown as IDebt;
  }

  it('returns 100% paid when balance is 0', () => {
    const debt = buildDebt({ currentBalance: 0 });
    const info = calculateDebtInfo(debt);
    expect(info.percentPaid).toBe(100);
    expect(info.monthsToPayoff).toBe(0);
    expect(info.totalInterestEstimate).toBe(0);
  });

  it('calculates correct paidAmount and percentPaid', () => {
    const debt = buildDebt({ originalAmount: 500000, currentBalance: 250000 });
    const info = calculateDebtInfo(debt);
    expect(info.paidAmount).toBe(250000);
    expect(info.percentPaid).toBe(50);
  });

  it('calculates monthsToPayoff with zero interest', () => {
    const debt = buildDebt({ interestRate: 0, currentBalance: 100000, minimumPayment: 10000 });
    const info = calculateDebtInfo(debt);
    expect(info.monthsToPayoff).toBe(10);
    expect(info.totalInterestEstimate).toBe(0);
  });

  it('returns null monthsToPayoff when minimumPayment does not cover interest', () => {
    // 20% APR on 500000 = ~8333/month interest. If minimum < 8333, can't pay off
    const debt = buildDebt({ interestRate: 20, currentBalance: 500000, minimumPayment: 5000 });
    const info = calculateDebtInfo(debt);
    expect(info.monthsToPayoff).toBeNull();
  });

  it('calculates positive totalInterestEstimate for a normal amortization', () => {
    const debt = buildDebt({ interestRate: 12, currentBalance: 120000, minimumPayment: 15000 });
    const info = calculateDebtInfo(debt);
    expect(info.monthsToPayoff).not.toBeNull();
    expect(info.totalInterestEstimate).not.toBeNull();
    expect(info.totalInterestEstimate!).toBeGreaterThan(0);
  });
});
