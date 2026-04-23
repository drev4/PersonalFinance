import {
  findByUser,
  findById,
  create,
  update,
  deactivate,
  type CreateGoalDTO,
  type UpdateGoalDTO,
} from './goal.repository.js';
import type { IGoal } from './goal.model.js';

// ---- Error class -------------------------------------------------------------

export class GoalError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'GoalError';
  }
}

// ---- Helpers -----------------------------------------------------------------

/**
 * Calculates the required monthly contribution to reach the goal on time.
 * Returns null if no deadline is set or the deadline has already passed.
 */
export function calculateMonthlySuggestion(goal: IGoal): number | null {
  if (goal.deadline === undefined || goal.deadline === null) {
    return null;
  }

  const now = new Date();
  const deadline = new Date(goal.deadline);

  if (deadline <= now) {
    return null;
  }

  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) {
    return 0;
  }

  // Number of months remaining (fractional)
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.4375; // average month
  const monthsLeft = (deadline.getTime() - now.getTime()) / msPerMonth;

  if (monthsLeft <= 0) {
    return null;
  }

  return Math.ceil(remaining / monthsLeft);
}

// ---- Service functions -------------------------------------------------------

export async function getUserGoals(userId: string): Promise<IGoal[]> {
  return findByUser(userId);
}

export async function createGoal(
  userId: string,
  dto: CreateGoalDTO,
): Promise<IGoal> {
  return create({ ...dto, userId });
}

export async function updateGoal(
  userId: string,
  goalId: string,
  dto: UpdateGoalDTO,
): Promise<IGoal> {
  const existing = await findById(goalId, userId);
  if (existing === null) {
    throw new GoalError('GOAL_NOT_FOUND', 'Goal not found', 404);
  }

  // Determine new amounts after update
  const newCurrentAmount = dto.currentAmount ?? existing.currentAmount;
  const newTargetAmount = dto.targetAmount ?? existing.targetAmount;

  // Auto-complete when current reaches target
  const shouldComplete = newCurrentAmount >= newTargetAmount;

  const updated = await update(goalId, userId, {
    ...dto,
    isCompleted: shouldComplete,
  });

  if (updated === null) {
    throw new GoalError('GOAL_NOT_FOUND', 'Goal not found', 404);
  }

  return updated;
}

export async function deleteGoal(
  userId: string,
  goalId: string,
): Promise<void> {
  const success = await deactivate(goalId, userId);
  if (!success) {
    throw new GoalError('GOAL_NOT_FOUND', 'Goal not found', 404);
  }
}

export async function getGoal(
  userId: string,
  goalId: string,
): Promise<IGoal> {
  const goal = await findById(goalId, userId);
  if (goal === null) {
    throw new GoalError('GOAL_NOT_FOUND', 'Goal not found', 404);
  }
  return goal;
}
