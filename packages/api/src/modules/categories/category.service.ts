import type { ICategory } from './category.model.js';
import {
  findByUser,
  findById,
  create,
  update,
  softDelete,
  type CreateCategoryDTO,
  type UpdateCategoryDTO,
} from './category.repository.js';
import { TransactionModel } from '../transactions/transaction.model.js';
import mongoose from 'mongoose';

export class CategoryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'CategoryError';
  }
}

export async function getUserCategories(userId: string): Promise<ICategory[]> {
  return findByUser(userId);
}

export async function createCategory(
  userId: string,
  dto: CreateCategoryDTO,
): Promise<ICategory> {
  return create({ ...dto, userId });
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  dto: UpdateCategoryDTO,
): Promise<ICategory> {
  const existing = await findById(categoryId, userId);
  if (existing === null) {
    throw new CategoryError(
      'CATEGORY_NOT_FOUND',
      'Category not found',
      404,
    );
  }

  const updated = await update(categoryId, userId, dto);
  if (updated === null) {
    throw new CategoryError(
      'CATEGORY_NOT_FOUND',
      'Category not found',
      404,
    );
  }
  return updated;
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<void> {
  const existing = await findById(categoryId, userId);
  if (existing === null) {
    throw new CategoryError(
      'CATEGORY_NOT_FOUND',
      'Category not found',
      404,
    );
  }

  // Check for active transactions referencing this category
  const txCount = await TransactionModel.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    categoryId: new mongoose.Types.ObjectId(categoryId),
  }).exec();

  if (txCount > 0) {
    throw new CategoryError(
      'CATEGORY_HAS_TRANSACTIONS',
      `Cannot delete category: it has ${txCount} transaction(s) associated with it`,
      409,
    );
  }

  await softDelete(categoryId, userId);
}
