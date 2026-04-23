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
  const accounts = await findByUser(userId);

  // For investment and crypto accounts, we want to include the current total 
  // value of holdings in the balance shown to the user.
  try {
    const { HoldingModel } = await import('../holdings/holding.model.js');

    // Fetch all holdings for these accounts
    const holdings = await HoldingModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean().exec();

    // Map holdings to account totals
    const holdingTotals = new Map<string, number>();
    for (const h of holdings) {
      const accId = h.accountId.toHexString();
      const qty = parseFloat(h.quantity);
      const price = h.currentPrice ?? 0;
      const value = Math.round(qty * price);

      holdingTotals.set(accId, (holdingTotals.get(accId) ?? 0) + value);
    }

    // Enrich account objects (as plain objects to avoid Mongoose doc issues)
    return accounts.map(acc => {
      const accId = acc._id.toHexString();
      if ((acc.type === 'investment' || acc.type === 'crypto') && holdingTotals.has(accId)) {
        // Return a shallow copy of the doc with the enriched balance
        const doc = acc.toObject ? acc.toObject() : acc;
        return {
          ...doc,
          currentBalance: doc.currentBalance + (holdingTotals.get(accId) ?? 0)
        } as unknown as IAccount;
      }
      return acc;
    });
  } catch (err) {
    // Fallback to raw accounts if enrichment fails
    return accounts;
  }
}

export async function getAccountById(userId: string, accountId: string): Promise<IAccount | null> {
  const account = await findById(accountId, userId);
  if (!account) return null;

  if (account.type !== 'investment' && account.type !== 'crypto') {
    return account;
  }

  try {
    const { HoldingModel } = await import('../holdings/holding.model.js');
    const holdings = await HoldingModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      accountId: new mongoose.Types.ObjectId(accountId),
    }).lean().exec();

    const holdingsTotal = holdings.reduce((sum, h) => {
      const qty = parseFloat(h.quantity);
      const price = h.currentPrice ?? 0;
      return sum + Math.round(qty * price);
    }, 0);

    const doc = account.toObject ? account.toObject() : account;
    return {
      ...doc,
      currentBalance: doc.currentBalance + holdingsTotal,
    } as unknown as IAccount;
  } catch {
    return account;
  }
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
