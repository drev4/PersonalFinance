import mongoose from 'mongoose';
import type { IAccount } from './account.model.js';
import type { ITransaction } from '../transactions/transaction.model.js';
import {
  findByUser,
  findById,
  create,
  update,
  updateBalance,
  archive,
  getNetWorth as repoGetNetWorth,
  type CreateAccountDTO,
  type UpdateAccountDTO,
  type NetWorthSummary,
} from './account.repository.js';
import { TransactionModel } from '../transactions/transaction.model.js';

export class AccountError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AccountError';
  }
}

export async function getUserAccounts(userId: string): Promise<IAccount[]> {
  return findByUser(userId);
}

export async function createAccount(
  userId: string,
  dto: CreateAccountDTO,
): Promise<IAccount> {
  return create({ ...dto, userId });
}

export async function updateAccount(
  userId: string,
  accountId: string,
  dto: UpdateAccountDTO,
): Promise<IAccount> {
  const existing = await findById(accountId, userId);
  if (existing === null || !existing.isActive) {
    throw new AccountError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
  }

  const updated = await update(accountId, userId, dto);
  if (updated === null) {
    throw new AccountError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
  }
  return updated;
}

export async function adjustBalance(
  userId: string,
  accountId: string,
  newBalance: number,
  note?: string,
): Promise<{ account: IAccount; transaction: ITransaction }> {
  const account = await findById(accountId, userId);
  if (account === null || !account.isActive) {
    throw new AccountError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
  }

  const diff = newBalance - account.currentBalance;

  const session = await mongoose.startSession();
  let updatedAccount: IAccount;
  let adjustmentTx: ITransaction;

  try {
    await session.withTransaction(async () => {
      await updateBalance(accountId, userId, newBalance);

      const freshAccount = await findById(accountId, userId);
      if (freshAccount === null) {
        throw new AccountError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
      }
      updatedAccount = freshAccount;

      const tx = new TransactionModel({
        userId: new mongoose.Types.ObjectId(userId),
        accountId: new mongoose.Types.ObjectId(accountId),
        type: 'adjustment',
        amount: Math.abs(diff),
        currency: account.currency,
        date: new Date(),
        description: note ?? 'Balance adjustment',
        source: 'adjustment',
        tags: [],
      });
      adjustmentTx = await tx.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return { account: updatedAccount!, transaction: adjustmentTx! };
}

export async function archiveAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  const existing = await findById(accountId, userId);
  if (existing === null) {
    throw new AccountError('ACCOUNT_NOT_FOUND', 'Account not found', 404);
  }

  const archived = await archive(accountId, userId);
  if (!archived) {
    throw new AccountError('ACCOUNT_NOT_FOUND', 'Account not found or already archived', 404);
  }
}

export async function getNetWorth(userId: string): Promise<NetWorthSummary> {
  return repoGetNetWorth(userId);
}
