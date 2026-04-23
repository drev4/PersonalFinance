import mongoose from 'mongoose';
import type { ITransaction } from './transaction.model.js';
import {
  findMany,
  findById,
  create,
  createMany,
  update,
  hardDelete,
  getSpendingByCategory as repoGetSpendingByCategory,
  getCashflow as repoGetCashflow,
  type TransactionFilters,
  type CreateTransactionDTO,
  type UpdateTransactionDTO,
  type CategorySpending,
  type CashflowData,
} from './transaction.repository.js';
import { findById as findAccountById, updateBalance } from '../accounts/account.repository.js';
import { CategoryRuleModel } from './categoryRule.model.js';
import { TransactionModel } from './transaction.model.js';

export class TransactionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTransferDTO {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  description: string;
  currency?: string;
  tags?: string[];
}

// ---- Helpers -----------------------------------------------------------------

/**
 * Applies the balance effect of a transaction to its account.
 * Income and transfers-in add to balance; expenses and transfers-out subtract.
 */
async function applyBalanceDelta(
  accountId: string,
  userId: string,
  type: ITransaction['type'],
  amount: number,
  session?: mongoose.ClientSession,
): Promise<void> {
  const account = await findAccountById(accountId, userId);
  if (account === null) {
    throw new TransactionError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
  }

  let newBalance: number;
  if (type === 'income' || type === 'adjustment') {
    newBalance = account.currentBalance + amount;
  } else {
    // expense, transfer (debit side)
    newBalance = account.currentBalance - amount;
  }

  await (session !== undefined
    ? mongoose.model('Account').findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(accountId), userId: new mongoose.Types.ObjectId(userId) },
        { $set: { currentBalance: newBalance } },
        { session },
      ).exec()
    : updateBalance(accountId, userId, newBalance));
}

async function revertBalanceDelta(
  accountId: string,
  userId: string,
  type: ITransaction['type'],
  amount: number,
  session?: mongoose.ClientSession,
): Promise<void> {
  const account = await findAccountById(accountId, userId);
  if (account === null) {
    throw new TransactionError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
  }

  let newBalance: number;
  if (type === 'income' || type === 'adjustment') {
    // Revert: subtract
    newBalance = account.currentBalance - amount;
  } else {
    // Revert expense/transfer: add back
    newBalance = account.currentBalance + amount;
  }

  await (session !== undefined
    ? mongoose.model('Account').findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(accountId), userId: new mongoose.Types.ObjectId(userId) },
        { $set: { currentBalance: newBalance } },
        { session },
      ).exec()
    : updateBalance(accountId, userId, newBalance));
}

// ---- Service methods ---------------------------------------------------------

export async function getTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<PaginatedResult<ITransaction>> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50));

  const { data, total } = await findMany(userId, { ...filters, page, limit });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTransaction(
  userId: string,
  transactionId: string,
): Promise<ITransaction> {
  const tx = await findById(transactionId, userId);
  if (tx === null) {
    throw new TransactionError(
      'TRANSACTION_NOT_FOUND',
      'Transaction not found',
      404,
    );
  }
  return tx;
}

export async function createTransaction(
  userId: string,
  dto: CreateTransactionDTO,
): Promise<ITransaction> {
  // Auto-categorise if no category provided
  let categoryId = dto.categoryId;
  if (categoryId === undefined) {
    const autoCategory = await applyCategoryRule(dto.description, userId);
    if (autoCategory !== null) {
      categoryId = autoCategory;
    }
  }

  const session = await mongoose.startSession();
  let tx: ITransaction;

  try {
    await session.withTransaction(async () => {
      tx = await create({ ...dto, userId, categoryId }, session);
      await applyBalanceDelta(dto.accountId, userId, dto.type, dto.amount, session);
    });
  } finally {
    await session.endSession();
  }

  return tx!;
}

export async function createTransfer(
  userId: string,
  dto: CreateTransferDTO,
): Promise<{ from: ITransaction; to: ITransaction }> {
  // Validate both accounts belong to the user
  const [fromAccount, toAccount] = await Promise.all([
    findAccountById(dto.fromAccountId, userId),
    findAccountById(dto.toAccountId, userId),
  ]);

  if (fromAccount === null || !fromAccount.isActive) {
    throw new TransactionError(
      'ACCOUNT_NOT_FOUND',
      'Source account not found',
      404,
    );
  }

  if (toAccount === null || !toAccount.isActive) {
    throw new TransactionError(
      'ACCOUNT_NOT_FOUND',
      'Destination account not found',
      404,
    );
  }

  if (dto.fromAccountId === dto.toAccountId) {
    throw new TransactionError(
      'SAME_ACCOUNT_TRANSFER',
      'Cannot transfer to the same account',
      400,
    );
  }

  const currency = dto.currency ?? fromAccount.currency;
  const session = await mongoose.startSession();
  let fromTx: ITransaction;
  let toTx: ITransaction;

  try {
    await session.withTransaction(async () => {
      fromTx = await create(
        {
          userId,
          accountId: dto.fromAccountId,
          type: 'transfer',
          amount: dto.amount,
          currency,
          date: dto.date,
          description: dto.description,
          transferToAccountId: dto.toAccountId,
          tags: dto.tags ?? [],
          source: 'manual',
        },
        session,
      );

      toTx = await create(
        {
          userId,
          accountId: dto.toAccountId,
          type: 'income',
          amount: dto.amount,
          currency,
          date: dto.date,
          description: dto.description,
          transferToAccountId: dto.fromAccountId,
          tags: dto.tags ?? [],
          source: 'manual',
        },
        session,
      );

      // Debit from source
      await applyBalanceDelta(dto.fromAccountId, userId, 'transfer', dto.amount, session);
      // Credit to destination — treat incoming transfer as income delta
      await applyBalanceDelta(dto.toAccountId, userId, 'income', dto.amount, session);
    });
  } finally {
    await session.endSession();
  }

  return { from: fromTx!, to: toTx! };
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  dto: UpdateTransactionDTO,
): Promise<ITransaction> {
  const existing = await findById(transactionId, userId);
  if (existing === null) {
    throw new TransactionError(
      'TRANSACTION_NOT_FOUND',
      'Transaction not found',
      404,
    );
  }

  const amountChanged =
    dto.amount !== undefined && dto.amount !== existing.amount;

  const session = await mongoose.startSession();
  let updated: ITransaction;

  try {
    await session.withTransaction(async () => {
      if (amountChanged) {
        // Revert old amount then apply new amount
        await revertBalanceDelta(
          existing.accountId.toHexString(),
          userId,
          existing.type,
          existing.amount,
          session,
        );
        await applyBalanceDelta(
          existing.accountId.toHexString(),
          userId,
          existing.type,
          dto.amount!,
          session,
        );
      }

      const result = await update(transactionId, userId, dto);
      if (result === null) {
        throw new TransactionError(
          'TRANSACTION_NOT_FOUND',
          'Transaction not found',
          404,
        );
      }
      updated = result;
    });
  } finally {
    await session.endSession();
  }

  return updated!;
}

export async function deleteTransaction(
  userId: string,
  transactionId: string,
): Promise<void> {
  const existing = await findById(transactionId, userId);
  if (existing === null) {
    throw new TransactionError(
      'TRANSACTION_NOT_FOUND',
      'Transaction not found',
      404,
    );
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await revertBalanceDelta(
        existing.accountId.toHexString(),
        userId,
        existing.type,
        existing.amount,
        session,
      );
      await hardDelete(transactionId, userId);
    });
  } finally {
    await session.endSession();
  }
}

export async function bulkCreate(
  userId: string,
  transactions: CreateTransactionDTO[],
): Promise<{ created: number; duplicates: number }> {
  if (transactions.length === 0) {
    return { created: 0, duplicates: 0 };
  }

  // Collect externalIds that have a value
  const externalIds = transactions
    .filter((t): t is CreateTransactionDTO & { externalId: string } =>
      t.externalId !== undefined && t.externalId.trim() !== '',
    )
    .map((t) => t.externalId);

  // Find already-existing externalIds for this user
  const existingExternalIds = new Set<string>();
  if (externalIds.length > 0) {
    const existing = await TransactionModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      externalId: { $in: externalIds },
    })
      .select('externalId')
      .exec();

    for (const doc of existing) {
      if (doc.externalId !== undefined) {
        existingExternalIds.add(doc.externalId);
      }
    }
  }

  const toInsert = transactions.filter((t) => {
    if (t.externalId === undefined || t.externalId.trim() === '') return true;
    return !existingExternalIds.has(t.externalId);
  });

  const duplicates = transactions.length - toInsert.length;

  if (toInsert.length === 0) {
    return { created: 0, duplicates };
  }

  const withUserId = toInsert.map((t) => ({ ...t, userId }));
  await createMany(withUserId);

  return { created: toInsert.length, duplicates };
}

export async function applyCategoryRule(
  description: string,
  userId: string,
): Promise<string | null> {
  const rules = await CategoryRuleModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  })
    .sort({ priority: -1 })
    .exec();

  for (const rule of rules) {
    const matched = rule.keywords.some((keyword) => {
      const regex = new RegExp(keyword, 'i');
      return regex.test(description);
    });

    if (matched) {
      return rule.categoryId.toHexString();
    }
  }

  return null;
}

export async function getSpendingByCategory(
  userId: string,
  from: Date,
  to: Date,
): Promise<CategorySpending[]> {
  return repoGetSpendingByCategory(userId, from, to);
}

export async function getCashflow(
  userId: string,
  months: number,
): Promise<CashflowData[]> {
  return repoGetCashflow(userId, months);
}
