import mongoose from 'mongoose';
import {
  findByUser,
  findById,
  create,
  update,
  deactivate,
  type CreateBudgetDTO,
  type UpdateBudgetDTO,
} from './budget.repository.js';
import type { IBudget } from './budget.model.js';
import { CategoryModel } from '../categories/category.model.js';
import { TransactionModel } from '../transactions/transaction.model.js';

// ---- Error class -------------------------------------------------------------

export class BudgetError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'BudgetError';
  }
}

// ---- Public interfaces -------------------------------------------------------

export interface BudgetItemProgress {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface BudgetProgress {
  budgetId: string;
  name: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  items: BudgetItemProgress[];
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  categoryName: string;
  percentageUsed: number;
  status: 'warning' | 'exceeded';
}

// ---- Period helpers ----------------------------------------------------------

function getPeriodRange(
  period: 'monthly' | 'yearly',
  referenceDate: Date,
): { start: Date; end: Date } {
  const ref = new Date(referenceDate);

  if (period === 'monthly') {
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // yearly
  const start = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function getPreviousPeriodRange(
  period: 'monthly' | 'yearly',
  referenceDate: Date,
): { start: Date; end: Date } {
  const ref = new Date(referenceDate);

  if (period === 'monthly') {
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    return getPeriodRange('monthly', prevMonth);
  }

  const prevYear = new Date(ref.getFullYear() - 1, 0, 1);
  return getPeriodRange('yearly', prevYear);
}

// ---- Aggregate spending for a set of category IDs ---------------------------

interface CategorySpendingRow {
  categoryId: string;
  total: number;
}

async function getSpendingForCategories(
  userId: string,
  categoryIds: mongoose.Types.ObjectId[],
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  if (categoryIds.length === 0) return new Map();

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: from, $lte: to },
        categoryId: { $in: categoryIds },
      },
    },
    {
      $group: {
        _id: '$categoryId',
        total: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        categoryId: { $toString: '$_id' },
        total: 1,
      },
    },
  ];

  const rows = await TransactionModel.aggregate<CategorySpendingRow>(pipeline).exec();
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.categoryId, row.total);
  }
  return map;
}

// ---- Item status helper ------------------------------------------------------

function resolveItemStatus(percentageUsed: number): 'ok' | 'warning' | 'exceeded' {
  if (percentageUsed > 100) return 'exceeded';
  if (percentageUsed >= 80) return 'warning';
  return 'ok';
}

// ---- Service functions -------------------------------------------------------

export async function getUserBudgets(userId: string): Promise<IBudget[]> {
  return findByUser(userId);
}

export async function createBudget(
  userId: string,
  dto: CreateBudgetDTO,
): Promise<IBudget> {
  if (dto.items.length > 0) {
    const categoryIds = dto.items.map(
      (item) => new mongoose.Types.ObjectId(item.categoryId),
    );

    const ownedCategories = await CategoryModel.find({
      _id: { $in: categoryIds },
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    })
      .select('_id')
      .exec();

    const ownedIds = new Set(
      ownedCategories.map((c) => c._id.toHexString()),
    );

    for (const item of dto.items) {
      if (!ownedIds.has(item.categoryId)) {
        throw new BudgetError(
          'INVALID_CATEGORY',
          `Category ${item.categoryId} does not belong to the user or does not exist`,
          422,
        );
      }
    }
  }

  return create({ ...dto, userId });
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  dto: UpdateBudgetDTO,
): Promise<IBudget> {
  // Validate categories on update if items are provided
  if (dto.items !== undefined && dto.items.length > 0) {
    const categoryIds = dto.items.map(
      (item) => new mongoose.Types.ObjectId(item.categoryId),
    );

    const ownedCategories = await CategoryModel.find({
      _id: { $in: categoryIds },
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    })
      .select('_id')
      .exec();

    const ownedIds = new Set(
      ownedCategories.map((c) => c._id.toHexString()),
    );

    for (const item of dto.items) {
      if (!ownedIds.has(item.categoryId)) {
        throw new BudgetError(
          'INVALID_CATEGORY',
          `Category ${item.categoryId} does not belong to the user or does not exist`,
          422,
        );
      }
    }
  }

  const updated = await update(budgetId, userId, dto);
  if (updated === null) {
    throw new BudgetError('BUDGET_NOT_FOUND', 'Budget not found', 404);
  }
  return updated;
}

export async function deleteBudget(
  userId: string,
  budgetId: string,
): Promise<void> {
  const success = await deactivate(budgetId, userId);
  if (!success) {
    throw new BudgetError('BUDGET_NOT_FOUND', 'Budget not found', 404);
  }
}

export async function getBudgetProgress(
  userId: string,
  budgetId: string,
  referenceDate: Date = new Date(),
): Promise<BudgetProgress> {
  const budget = await findById(budgetId, userId);
  if (budget === null || !budget.isActive) {
    throw new BudgetError('BUDGET_NOT_FOUND', 'Budget not found', 404);
  }

  const { start: periodStart, end: periodEnd } = getPeriodRange(
    budget.period,
    referenceDate,
  );

  const categoryIds = budget.items.map((item) => item.categoryId);

  // Fetch category metadata for names and colors
  const categories = await CategoryModel.find({
    _id: { $in: categoryIds },
  })
    .select('_id name color')
    .exec();

  const categoryMeta = new Map(
    categories.map((c) => [
      c._id.toHexString(),
      { name: c.name, color: c.color },
    ]),
  );

  // Spending in current period
  const spendingMap = await getSpendingForCategories(
    userId,
    categoryIds,
    periodStart,
    periodEnd,
  );

  // Rollover: compute previous-period surpluses per item and add to budgeted
  let rolloverMap = new Map<string, number>();
  if (budget.rollover) {
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(
      budget.period,
      referenceDate,
    );
    const prevSpendingMap = await getSpendingForCategories(
      userId,
      categoryIds,
      prevStart,
      prevEnd,
    );

    for (const item of budget.items) {
      const catId = item.categoryId.toHexString();
      const prevSpent = prevSpendingMap.get(catId) ?? 0;
      const surplus = item.amount - prevSpent;
      // Only roll over positive surplus (unspent amount)
      rolloverMap.set(catId, surplus > 0 ? surplus : 0);
    }
  }

  // Build item-level progress
  let totalBudgeted = 0;
  let totalSpent = 0;

  const itemsProgress: BudgetItemProgress[] = budget.items.map((item) => {
    const catId = item.categoryId.toHexString();
    const rolloverAmount = rolloverMap.get(catId) ?? 0;
    const budgeted = item.amount + rolloverAmount;
    const spent = spendingMap.get(catId) ?? 0;
    const remaining = budgeted - spent;
    const percentageUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    const status = resolveItemStatus(percentageUsed);
    const meta = categoryMeta.get(catId);

    totalBudgeted += budgeted;
    totalSpent += spent;

    return {
      categoryId: catId,
      categoryName: meta?.name ?? 'Unknown',
      categoryColor: meta?.color ?? '#cccccc',
      budgeted,
      spent,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      status,
    };
  });

  const remaining = totalBudgeted - totalSpent;
  const percentageUsed =
    totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return {
    budgetId: budget._id.toHexString(),
    name: budget.name,
    period: budget.period,
    periodStart,
    periodEnd,
    totalBudgeted,
    totalSpent,
    remaining,
    percentageUsed: Math.round(percentageUsed * 100) / 100,
    items: itemsProgress,
  };
}

export async function checkBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
  const budgets = await findByUser(userId);
  const alerts: BudgetAlert[] = [];
  const now = new Date();

  for (const budget of budgets) {
    const progress = await getBudgetProgress(userId, budget._id.toHexString(), now);

    for (const item of progress.items) {
      if (item.percentageUsed >= 80) {
        alerts.push({
          budgetId: budget._id.toHexString(),
          budgetName: budget.name,
          categoryName: item.categoryName,
          percentageUsed: item.percentageUsed,
          status: item.status === 'exceeded' ? 'exceeded' : 'warning',
        });
      }
    }
  }

  return alerts;
}
