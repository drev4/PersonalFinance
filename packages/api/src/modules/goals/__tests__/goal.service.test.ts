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
import { GoalModel } from '../goal.model.js';
import {
  getUserGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoal,
  calculateMonthlySuggestion,
  GoalError,
} from '../goal.service.js';
import type { IGoal } from '../goal.model.js';

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
  await GoalModel.deleteMany({});
  vi.clearAllMocks();
});

// ---- Helpers ----------------------------------------------------------------

async function makeGoal(overrides: {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date;
  color?: string;
} = {}) {
  return createGoal(FAKE_USER_ID, {
    userId: FAKE_USER_ID,
    name: overrides.name ?? 'Emergency Fund',
    targetAmount: overrides.targetAmount ?? 100000,
    currentAmount: overrides.currentAmount ?? 0,
    deadline: overrides.deadline,
    color: overrides.color,
  });
}

// =============================================================================
// createGoal() — basic CRUD
// =============================================================================

describe('createGoal()', () => {
  it('creates a goal with correct defaults', async () => {
    const goal = await makeGoal();

    expect(goal.name).toBe('Emergency Fund');
    expect(goal.targetAmount).toBe(100000);
    expect(goal.currentAmount).toBe(0);
    expect(goal.isCompleted).toBe(false);
    expect(goal.isActive).toBe(true);
    expect(goal.userId.toHexString()).toBe(FAKE_USER_ID);
  });

  it('persists optional fields like deadline and color', async () => {
    const deadline = new Date('2027-12-31');
    const goal = await makeGoal({ deadline, color: '#00ff00' });

    expect(goal.deadline).toEqual(deadline);
    expect(goal.color).toBe('#00ff00');
  });

  it('creates multiple goals for the same user', async () => {
    await makeGoal({ name: 'Car fund' });
    await makeGoal({ name: 'Holiday fund' });

    const goals = await getUserGoals(FAKE_USER_ID);
    expect(goals).toHaveLength(2);
  });
});

// =============================================================================
// getUserGoals() — active + recently completed
// =============================================================================

describe('getUserGoals()', () => {
  it('returns active incomplete goals', async () => {
    await makeGoal({ name: 'Goal A' });
    await makeGoal({ name: 'Goal B' });

    const goals = await getUserGoals(FAKE_USER_ID);
    expect(goals).toHaveLength(2);
  });

  it('includes completed goals from the last 30 days', async () => {
    // Create and immediately complete a goal
    const goal = await makeGoal({ targetAmount: 1000, currentAmount: 1000 });
    await GoalModel.findByIdAndUpdate(goal._id, { isCompleted: true }).exec();

    const goals = await getUserGoals(FAKE_USER_ID);
    expect(goals).toHaveLength(1);
    expect(goals[0].isCompleted).toBe(true);
  });

  it('excludes goals completed more than 30 days ago', async () => {
    const goal = await makeGoal();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);

    await GoalModel.findByIdAndUpdate(goal._id, {
      isCompleted: true,
      updatedAt: oldDate,
    }).exec();

    const goals = await getUserGoals(FAKE_USER_ID);
    // The goal was completed > 30 days ago so should not appear
    const completedGoals = goals.filter((g) => g.isCompleted);
    expect(completedGoals).toHaveLength(0);
  });

  it('excludes soft-deleted goals', async () => {
    const goal = await makeGoal({ name: 'To Delete' });
    await deleteGoal(FAKE_USER_ID, goal._id.toHexString());

    const goals = await getUserGoals(FAKE_USER_ID);
    expect(goals).toHaveLength(0);
  });
});

// =============================================================================
// getGoal() — single fetch
// =============================================================================

describe('getGoal()', () => {
  it('returns the goal by id', async () => {
    const created = await makeGoal({ name: 'Vacation' });
    const fetched = await getGoal(FAKE_USER_ID, created._id.toHexString());
    expect(fetched._id.toHexString()).toBe(created._id.toHexString());
    expect(fetched.name).toBe('Vacation');
  });

  it('throws GOAL_NOT_FOUND for a non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await getGoal(FAKE_USER_ID, fakeId).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GoalError);
    expect((error as GoalError).code).toBe('GOAL_NOT_FOUND');
    expect((error as GoalError).statusCode).toBe(404);
  });
});

// =============================================================================
// updateGoal() — auto-complete when currentAmount >= targetAmount
// =============================================================================

describe('updateGoal() — auto-completion', () => {
  it('does not auto-complete when currentAmount is below targetAmount', async () => {
    const goal = await makeGoal({ targetAmount: 100000 });
    const updated = await updateGoal(FAKE_USER_ID, goal._id.toHexString(), {
      currentAmount: 50000,
    });
    expect(updated.isCompleted).toBe(false);
    expect(updated.currentAmount).toBe(50000);
  });

  it('auto-completes when currentAmount equals targetAmount', async () => {
    const goal = await makeGoal({ targetAmount: 100000 });
    const updated = await updateGoal(FAKE_USER_ID, goal._id.toHexString(), {
      currentAmount: 100000,
    });
    expect(updated.isCompleted).toBe(true);
  });

  it('auto-completes when currentAmount exceeds targetAmount', async () => {
    const goal = await makeGoal({ targetAmount: 100000 });
    const updated = await updateGoal(FAKE_USER_ID, goal._id.toHexString(), {
      currentAmount: 120000,
    });
    expect(updated.isCompleted).toBe(true);
  });

  it('re-checks completion when targetAmount is updated downward', async () => {
    const goal = await makeGoal({ targetAmount: 100000, currentAmount: 80000 });
    // Lower target to 80000 — currentAmount now meets the target
    const updated = await updateGoal(FAKE_USER_ID, goal._id.toHexString(), {
      targetAmount: 80000,
    });
    expect(updated.isCompleted).toBe(true);
  });

  it('updates other fields correctly', async () => {
    const goal = await makeGoal({ name: 'Old Name' });
    const updated = await updateGoal(FAKE_USER_ID, goal._id.toHexString(), {
      name: 'New Name',
      color: '#123456',
    });
    expect(updated.name).toBe('New Name');
    expect(updated.color).toBe('#123456');
    expect(updated.isCompleted).toBe(false);
  });

  it('throws GOAL_NOT_FOUND for a non-existent goal', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await updateGoal(FAKE_USER_ID, fakeId, { name: 'X' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(GoalError);
    expect((error as GoalError).code).toBe('GOAL_NOT_FOUND');
  });
});

// =============================================================================
// deleteGoal() — soft delete
// =============================================================================

describe('deleteGoal()', () => {
  it('soft-deletes the goal (isActive: false)', async () => {
    const goal = await makeGoal();
    await deleteGoal(FAKE_USER_ID, goal._id.toHexString());

    const inDb = await GoalModel.findById(goal._id).exec();
    expect(inDb).not.toBeNull();
    expect(inDb!.isActive).toBe(false);
  });

  it('throws GOAL_NOT_FOUND for a non-existent goal', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await deleteGoal(FAKE_USER_ID, fakeId).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GoalError);
    expect((error as GoalError).code).toBe('GOAL_NOT_FOUND');
    expect((error as GoalError).statusCode).toBe(404);
  });

  it('prevents accessing a deleted goal', async () => {
    const goal = await makeGoal();
    await deleteGoal(FAKE_USER_ID, goal._id.toHexString());

    const error = await getGoal(FAKE_USER_ID, goal._id.toHexString()).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(GoalError);
    expect((error as GoalError).code).toBe('GOAL_NOT_FOUND');
  });
});

// =============================================================================
// calculateMonthlySuggestion()
// =============================================================================

describe('calculateMonthlySuggestion()', () => {
  function buildGoal(overrides: Partial<IGoal>): IGoal {
    return {
      targetAmount: 120000,
      currentAmount: 0,
      isCompleted: false,
      isActive: true,
      ...overrides,
    } as unknown as IGoal;
  }

  it('returns null when there is no deadline', () => {
    const goal = buildGoal({ deadline: undefined });
    expect(calculateMonthlySuggestion(goal)).toBeNull();
  });

  it('returns null when the deadline has already passed', () => {
    const pastDeadline = new Date();
    pastDeadline.setFullYear(pastDeadline.getFullYear() - 1);
    const goal = buildGoal({ deadline: pastDeadline });
    expect(calculateMonthlySuggestion(goal)).toBeNull();
  });

  it('returns 0 when the goal is already met (currentAmount >= targetAmount)', () => {
    const futureDeadline = new Date();
    futureDeadline.setFullYear(futureDeadline.getFullYear() + 1);
    const goal = buildGoal({
      targetAmount: 100000,
      currentAmount: 100000,
      deadline: futureDeadline,
    });
    expect(calculateMonthlySuggestion(goal)).toBe(0);
  });

  it('calculates the correct monthly contribution for a future goal', () => {
    // Target: 120000, current: 0, deadline: ~12 months from now
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 12);

    const goal = buildGoal({
      targetAmount: 120000,
      currentAmount: 0,
      deadline,
    });

    const suggestion = calculateMonthlySuggestion(goal);
    expect(suggestion).not.toBeNull();
    // Should be approximately 10000 per month (120000 / 12)
    // Allow some tolerance due to fractional months
    expect(suggestion!).toBeGreaterThan(9000);
    expect(suggestion!).toBeLessThan(11000);
  });

  it('accounts for partial progress already made', () => {
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 10);

    const goal = buildGoal({
      targetAmount: 100000,
      currentAmount: 50000,
      deadline,
    });

    const suggestion = calculateMonthlySuggestion(goal);
    expect(suggestion).not.toBeNull();
    // Remaining 50000 / ~10 months ≈ 5000/month
    expect(suggestion!).toBeGreaterThan(4000);
    expect(suggestion!).toBeLessThan(6500);
  });

  it('returns a positive integer (ceiling) for the suggestion', () => {
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 7);

    const goal = buildGoal({
      targetAmount: 100003, // non-divisible amount
      currentAmount: 0,
      deadline,
    });

    const suggestion = calculateMonthlySuggestion(goal);
    expect(suggestion).not.toBeNull();
    expect(Number.isInteger(suggestion)).toBe(true);
    expect(suggestion!).toBeGreaterThan(0);
  });
});
