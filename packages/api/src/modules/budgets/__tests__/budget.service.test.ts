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
import { BudgetModel } from '../budget.model.js';
import { CategoryModel } from '../../categories/category.model.js';
import { TransactionModel } from '../../transactions/transaction.model.js';
import { AccountModel } from '../../accounts/account.model.js';
import {
  getUserBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetProgress,
  checkBudgetAlerts,
  BudgetError,
} from '../budget.service.js';

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
  await BudgetModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await TransactionModel.deleteMany({});
  await AccountModel.deleteMany({});
  vi.clearAllMocks();
});

// ---- Helpers ----------------------------------------------------------------

async function makeCategory(
  userId = FAKE_USER_ID,
  overrides: { name?: string; color?: string } = {},
) {
  const cat = new CategoryModel({
    userId: new mongoose.Types.ObjectId(userId),
    name: overrides.name ?? 'Food',
    type: 'expense',
    color: overrides.color ?? '#ff0000',
    icon: 'food',
    isDefault: false,
    isActive: true,
  });
  return cat.save();
}

async function makeAccount(userId = FAKE_USER_ID) {
  const account = new AccountModel({
    userId: new mongoose.Types.ObjectId(userId),
    name: 'Test Account',
    type: 'checking',
    currency: 'EUR',
    currentBalance: 100000,
    initialBalance: 100000,
    isActive: true,
    includedInNetWorth: true,
  });
  return account.save();
}

async function makeExpense(
  userId: string,
  accountId: string,
  categoryId: string,
  amount: number,
  date: Date,
) {
  const tx = new TransactionModel({
    userId: new mongoose.Types.ObjectId(userId),
    accountId: new mongoose.Types.ObjectId(accountId),
    type: 'expense',
    amount,
    currency: 'EUR',
    date,
    description: 'Test expense',
    categoryId: new mongoose.Types.ObjectId(categoryId),
    source: 'manual',
  });
  return tx.save();
}

async function makeBudget(
  userId: string,
  items: Array<{ categoryId: string; amount: number }>,
  overrides: { period?: 'monthly' | 'yearly'; rollover?: boolean; name?: string } = {},
) {
  return createBudget(userId, {
    userId,
    name: overrides.name ?? 'Test Budget',
    period: overrides.period ?? 'monthly',
    startDate: new Date('2026-01-01'),
    items,
    rollover: overrides.rollover ?? false,
  });
}

// =============================================================================
// createBudget() — category ownership validation
// =============================================================================

describe('createBudget() — category validation', () => {
  it('creates a budget when all categoryIds belong to the user', async () => {
    const cat = await makeCategory(FAKE_USER_ID);

    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 50000 },
    ]);

    expect(budget.name).toBe('Test Budget');
    expect(budget.items).toHaveLength(1);
    expect(budget.items[0].amount).toBe(50000);
    expect(budget.isActive).toBe(true);
  });

  it('throws INVALID_CATEGORY when a categoryId belongs to another user', async () => {
    const otherCat = await makeCategory(OTHER_USER_ID);

    const error = await makeBudget(FAKE_USER_ID, [
      { categoryId: otherCat._id.toHexString(), amount: 10000 },
    ]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BudgetError);
    expect((error as BudgetError).code).toBe('INVALID_CATEGORY');
    expect((error as BudgetError).statusCode).toBe(422);
  });

  it('throws INVALID_CATEGORY when categoryId does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();

    const error = await makeBudget(FAKE_USER_ID, [
      { categoryId: fakeId, amount: 10000 },
    ]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BudgetError);
    expect((error as BudgetError).code).toBe('INVALID_CATEGORY');
  });

  it('throws INVALID_CATEGORY when mixing own and foreign categories', async () => {
    const ownCat = await makeCategory(FAKE_USER_ID);
    const foreignCat = await makeCategory(OTHER_USER_ID);

    const error = await makeBudget(FAKE_USER_ID, [
      { categoryId: ownCat._id.toHexString(), amount: 10000 },
      { categoryId: foreignCat._id.toHexString(), amount: 5000 },
    ]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BudgetError);
    expect((error as BudgetError).code).toBe('INVALID_CATEGORY');
  });
});

// =============================================================================
// getUserBudgets() — only active budgets
// =============================================================================

describe('getUserBudgets()', () => {
  it('returns only active budgets for the user', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    await makeBudget(FAKE_USER_ID, [{ categoryId: cat._id.toHexString(), amount: 10000 }], {
      name: 'Budget A',
    });
    const budgetB = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 20000 },
    ], { name: 'Budget B' });

    // Soft-delete B
    await deleteBudget(FAKE_USER_ID, budgetB._id.toHexString());

    const budgets = await getUserBudgets(FAKE_USER_ID);
    expect(budgets).toHaveLength(1);
    expect(budgets[0].name).toBe('Budget A');
  });
});

// =============================================================================
// deleteBudget() — soft delete
// =============================================================================

describe('deleteBudget()', () => {
  it('soft-deletes a budget (sets isActive: false)', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 10000 },
    ]);

    await deleteBudget(FAKE_USER_ID, budget._id.toHexString());

    const inDb = await BudgetModel.findById(budget._id).exec();
    expect(inDb).not.toBeNull();
    expect(inDb!.isActive).toBe(false);
  });

  it('throws BUDGET_NOT_FOUND for a non-existent budget', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await deleteBudget(FAKE_USER_ID, fakeId).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BudgetError);
    expect((error as BudgetError).code).toBe('BUDGET_NOT_FOUND');
    expect((error as BudgetError).statusCode).toBe(404);
  });
});

// =============================================================================
// getBudgetProgress() — monthly period, percentages, status
// =============================================================================

describe('getBudgetProgress() — monthly period', () => {
  it('computes the correct period start and end for a monthly budget', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 50000 },
    ]);

    const referenceDate = new Date('2026-04-15T12:00:00.000Z');
    const progress = await getBudgetProgress(FAKE_USER_ID, budget._id.toHexString(), referenceDate);

    expect(progress.periodStart).toEqual(new Date(2026, 3, 1, 0, 0, 0, 0));  // April 1
    expect(progress.periodEnd).toEqual(new Date(2026, 3, 30, 23, 59, 59, 999)); // April 30
  });

  it('correctly sums spending within the period', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const account = await makeAccount(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 100000 },
    ]);

    // Two expenses in April 2026
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 30000, new Date('2026-04-10'));
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 20000, new Date('2026-04-20'));
    // One expense outside the period (March 2026) — should be excluded
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 5000, new Date('2026-03-15'));

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'),
    );

    expect(progress.totalBudgeted).toBe(100000);
    expect(progress.totalSpent).toBe(50000);
    expect(progress.remaining).toBe(50000);
    expect(progress.percentageUsed).toBe(50);
  });

  it('returns status "ok" when percentageUsed < 80', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const account = await makeAccount(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 100000 },
    ]);

    // 50% used
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 50000, new Date('2026-04-01'));

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'),
    );

    expect(progress.items[0].status).toBe('ok');
  });

  it('returns status "warning" when percentageUsed is between 80 and 100', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const account = await makeAccount(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 100000 },
    ]);

    // 85% used
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 85000, new Date('2026-04-01'));

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'),
    );

    expect(progress.items[0].status).toBe('warning');
    expect(progress.items[0].percentageUsed).toBe(85);
  });

  it('returns status "exceeded" when percentageUsed > 100', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const account = await makeAccount(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 100000 },
    ]);

    // 110% used
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 110000, new Date('2026-04-01'));

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'),
    );

    expect(progress.items[0].status).toBe('exceeded');
    expect(progress.items[0].remaining).toBe(-10000);
  });

  it('enriches items with category name and color', async () => {
    const cat = await makeCategory(FAKE_USER_ID, { name: 'Groceries', color: '#aabbcc' });
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 50000 },
    ]);

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'),
    );

    expect(progress.items[0].categoryName).toBe('Groceries');
    expect(progress.items[0].categoryColor).toBe('#aabbcc');
  });

  it('throws BUDGET_NOT_FOUND for an inactive budget', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 50000 },
    ]);
    await deleteBudget(FAKE_USER_ID, budget._id.toHexString());

    const error = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BudgetError);
    expect((error as BudgetError).code).toBe('BUDGET_NOT_FOUND');
  });
});

// =============================================================================
// getBudgetProgress() — yearly period
// =============================================================================

describe('getBudgetProgress() — yearly period', () => {
  it('computes the correct period for a yearly budget', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const budget = await makeBudget(
      FAKE_USER_ID,
      [{ categoryId: cat._id.toHexString(), amount: 1200000 }],
      { period: 'yearly' },
    );

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-07-01'),
    );

    expect(progress.periodStart).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    expect(progress.periodEnd).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });
});

// =============================================================================
// getBudgetProgress() — rollover
// =============================================================================

describe('getBudgetProgress() — rollover', () => {
  it('adds the previous period surplus to the current period budget', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const account = await makeAccount(FAKE_USER_ID);
    const budget = await makeBudget(
      FAKE_USER_ID,
      [{ categoryId: cat._id.toHexString(), amount: 100000 }],
      { rollover: true },
    );

    // March: spent 60000 out of 100000 → surplus of 40000 carries over
    await makeExpense(
      FAKE_USER_ID,
      account._id.toHexString(),
      cat._id.toHexString(),
      60000,
      new Date('2026-03-15'),
    );

    // April: spent 50000
    await makeExpense(
      FAKE_USER_ID,
      account._id.toHexString(),
      cat._id.toHexString(),
      50000,
      new Date('2026-04-10'),
    );

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'), // reference date in April
    );

    // Budgeted for April = 100000 (base) + 40000 (rollover from March) = 140000
    expect(progress.items[0].budgeted).toBe(140000);
    expect(progress.items[0].spent).toBe(50000);
    expect(progress.items[0].remaining).toBe(90000);
  });

  it('does not carry over a deficit from the previous period', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const account = await makeAccount(FAKE_USER_ID);
    const budget = await makeBudget(
      FAKE_USER_ID,
      [{ categoryId: cat._id.toHexString(), amount: 100000 }],
      { rollover: true },
    );

    // March: spent 120000 (overspent by 20000) — no surplus to carry over
    await makeExpense(
      FAKE_USER_ID,
      account._id.toHexString(),
      cat._id.toHexString(),
      120000,
      new Date('2026-03-15'),
    );

    const progress = await getBudgetProgress(
      FAKE_USER_ID,
      budget._id.toHexString(),
      new Date('2026-04-22'),
    );

    // Base budget only — no deficit carry-over
    expect(progress.items[0].budgeted).toBe(100000);
  });
});

// =============================================================================
// checkBudgetAlerts()
// =============================================================================

describe('checkBudgetAlerts()', () => {
  it('returns empty array when no budget item has reached 80%', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 100000 },
    ]);

    const alerts = await checkBudgetAlerts(FAKE_USER_ID);
    expect(alerts).toHaveLength(0);
  });

  it('returns alerts only for items at or above 80%', async () => {
    const cat1 = await makeCategory(FAKE_USER_ID, { name: 'Food' });
    const cat2 = await makeCategory(FAKE_USER_ID, { name: 'Transport' });
    const account = await makeAccount(FAKE_USER_ID);

    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat1._id.toHexString(), amount: 100000 }, // will be at 85%
      { categoryId: cat2._id.toHexString(), amount: 100000 }, // will be at 30%
    ]);

    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat1._id.toHexString(), 85000, new Date());
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat2._id.toHexString(), 30000, new Date());

    const alerts = await checkBudgetAlerts(FAKE_USER_ID);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].budgetId).toBe(budget._id.toHexString());
    expect(alerts[0].categoryName).toBe('Food');
    expect(alerts[0].status).toBe('warning');
    expect(alerts[0].percentageUsed).toBe(85);
  });

  it('marks exceeded items with status "exceeded"', async () => {
    const cat = await makeCategory(FAKE_USER_ID, { name: 'Entertainment' });
    const account = await makeAccount(FAKE_USER_ID);

    await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 50000 },
    ]);

    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 60000, new Date());

    const alerts = await checkBudgetAlerts(FAKE_USER_ID);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe('exceeded');
  });

  it('includes budget name in the alert', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const account = await makeAccount(FAKE_USER_ID);

    await makeBudget(
      FAKE_USER_ID,
      [{ categoryId: cat._id.toHexString(), amount: 10000 }],
      { name: 'Monthly Household' },
    );

    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat._id.toHexString(), 9000, new Date());

    const alerts = await checkBudgetAlerts(FAKE_USER_ID);
    expect(alerts[0].budgetName).toBe('Monthly Household');
  });

  it('returns alerts from multiple budgets', async () => {
    const cat1 = await makeCategory(FAKE_USER_ID, { name: 'Cat A' });
    const cat2 = await makeCategory(FAKE_USER_ID, { name: 'Cat B' });
    const account = await makeAccount(FAKE_USER_ID);

    await makeBudget(FAKE_USER_ID, [
      { categoryId: cat1._id.toHexString(), amount: 10000 },
    ], { name: 'Budget 1' });

    await makeBudget(FAKE_USER_ID, [
      { categoryId: cat2._id.toHexString(), amount: 10000 },
    ], { name: 'Budget 2' });

    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat1._id.toHexString(), 9000, new Date());
    await makeExpense(FAKE_USER_ID, account._id.toHexString(), cat2._id.toHexString(), 9500, new Date());

    const alerts = await checkBudgetAlerts(FAKE_USER_ID);
    expect(alerts).toHaveLength(2);
  });
});

// =============================================================================
// updateBudget()
// =============================================================================

describe('updateBudget()', () => {
  it('updates name and rollover fields', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 50000 },
    ]);

    const updated = await updateBudget(FAKE_USER_ID, budget._id.toHexString(), {
      name: 'Updated Budget',
      rollover: true,
    });

    expect(updated.name).toBe('Updated Budget');
    expect(updated.rollover).toBe(true);
  });

  it('throws BUDGET_NOT_FOUND for a non-existent budget', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await updateBudget(FAKE_USER_ID, fakeId, { name: 'New' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(BudgetError);
    expect((error as BudgetError).code).toBe('BUDGET_NOT_FOUND');
  });

  it('validates category ownership on item update', async () => {
    const cat = await makeCategory(FAKE_USER_ID);
    const foreignCat = await makeCategory(OTHER_USER_ID);
    const budget = await makeBudget(FAKE_USER_ID, [
      { categoryId: cat._id.toHexString(), amount: 10000 },
    ]);

    const error = await updateBudget(FAKE_USER_ID, budget._id.toHexString(), {
      items: [{ categoryId: foreignCat._id.toHexString(), amount: 5000 }],
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BudgetError);
    expect((error as BudgetError).code).toBe('INVALID_CATEGORY');
  });
});
