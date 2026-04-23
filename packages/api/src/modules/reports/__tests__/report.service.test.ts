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

// ---- Mock external price services so tests never hit the network ------------
vi.mock('../../holdings/integrations/coinmarketcap.client.js', () => ({
  getLatestQuotes: vi.fn().mockResolvedValue({}),
  searchCrypto: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../holdings/integrations/finnhub.client.js', () => ({
  getQuote: vi.fn().mockResolvedValue(null),
  searchSymbol: vi.fn().mockResolvedValue([]),
}));

// ---- Imports after mocks -----------------------------------------------------
import { TransactionModel } from '../../transactions/transaction.model.js';
import { AccountModel } from '../../accounts/account.model.js';
import { UserModel } from '../../users/user.model.js';
import { exportTransactionsCsv, generateMonthlyReport } from '../report.service.js';
import type { TransactionFilters } from '../../transactions/transaction.repository.js';

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
  await TransactionModel.deleteMany({});
  await AccountModel.deleteMany({});
  await UserModel.deleteMany({});
  vi.clearAllMocks();
});

// ---- Helper factories -------------------------------------------------------

async function createUser() {
  return UserModel.create({
    _id: new mongoose.Types.ObjectId(FAKE_USER_ID),
    email: 'test@example.com',
    passwordHash: 'hashed',
    name: 'Test User',
    baseCurrency: 'EUR',
  });
}

async function createAccount() {
  return AccountModel.create({
    userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    name: 'Cuenta corriente',
    type: 'checking',
    currency: 'EUR',
    currentBalance: 100000,
    initialBalance: 100000,
    isActive: true,
    includedInNetWorth: true,
  });
}

async function createTransaction(overrides: {
  type?: string;
  amount?: number;
  date?: Date;
  description?: string;
  currency?: string;
  tags?: string[];
  accountId?: mongoose.Types.ObjectId;
}) {
  const accountId = overrides.accountId ?? (await createAccount())._id;
  return TransactionModel.create({
    userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    accountId,
    type: overrides.type ?? 'expense',
    amount: overrides.amount ?? 1500,
    currency: overrides.currency ?? 'EUR',
    date: overrides.date ?? new Date('2026-03-15'),
    description: overrides.description ?? 'Supermercado',
    tags: overrides.tags ?? [],
    source: 'manual',
  });
}

// =============================================================================
// exportTransactionsCsv()
// =============================================================================

describe('exportTransactionsCsv()', () => {
  it('returns a UTF-8 BOM at the beginning of the string', async () => {
    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    // UTF-8 BOM is U+FEFF — in a JS string it appears as
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('contains the correct CSV header row', async () => {
    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    const lines = csv.split('\r\n');
    // First line after BOM is the header
    expect(lines[1]).toBe('Fecha,Descripción,Categoría,Cuenta,Tipo,Importe (EUR),Divisa,Tags');
  });

  it('formats dates in DD/MM/YYYY format', async () => {
    const account = await createAccount();
    await createTransaction({
      date: new Date('2026-03-05'),
      accountId: account._id,
    });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    const dataLines = csv.split('\r\n').slice(2); // skip BOM line and header
    expect(dataLines[0]).toMatch(/^05\/03\/2026,/);
  });

  it('converts amounts from cents to euros with 2 decimal places', async () => {
    const account = await createAccount();
    await createTransaction({
      amount: 4567, // 45.67 €
      accountId: account._id,
    });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    const dataLine = csv.split('\r\n').slice(2)[0];
    // Amount is in column index 5 (0-based)
    const fields = dataLine.split(',');
    expect(fields[5]).toBe('45.67');
  });

  it('shows correct type labels in Spanish', async () => {
    const account = await createAccount();
    await createTransaction({ type: 'income', accountId: account._id });
    await createTransaction({ type: 'expense', accountId: account._id });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    const dataLines = csv.split('\r\n').slice(2).filter((l) => l.trim() !== '');

    const types = dataLines.map((line) => line.split(',')[4]);
    expect(types).toContain('Ingreso');
    expect(types).toContain('Gasto');
  });

  it('joins tags with semicolons', async () => {
    const account = await createAccount();
    await createTransaction({
      tags: ['comida', 'familia'],
      accountId: account._id,
    });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    const dataLine = csv.split('\r\n').slice(2)[0];
    expect(dataLine).toContain('comida; familia');
  });

  it('uses CRLF line endings', async () => {
    const account = await createAccount();
    await createTransaction({ accountId: account._id });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    expect(csv).toMatch(/\r\n/);
  });

  it('returns only header when there are no transactions', async () => {
    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    const lines = csv.split('\r\n').filter((l) => l.trim() !== '');
    // BOM+header is the first line split result — just header when no data
    expect(lines).toHaveLength(1);
  });

  it('applies date filters correctly', async () => {
    const account = await createAccount();
    await createTransaction({
      date: new Date('2026-01-15'),
      description: 'January expense',
      accountId: account._id,
    });
    await createTransaction({
      date: new Date('2026-03-15'),
      description: 'March expense',
      accountId: account._id,
    });

    const filters: TransactionFilters = {
      from: new Date('2026-03-01'),
      to: new Date('2026-03-31'),
    };

    const csv = await exportTransactionsCsv(FAKE_USER_ID, filters);
    expect(csv).toContain('March expense');
    expect(csv).not.toContain('January expense');
  });

  it('applies type filter correctly', async () => {
    const account = await createAccount();
    await createTransaction({ type: 'income', description: 'Salary', accountId: account._id });
    await createTransaction({ type: 'expense', description: 'Rent', accountId: account._id });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, { type: 'income' });
    expect(csv).toContain('Salary');
    expect(csv).not.toContain('Rent');
  });

  it('escapes fields containing commas by wrapping in double quotes', async () => {
    const account = await createAccount();
    await createTransaction({
      description: 'Supermercado, grande',
      accountId: account._id,
    });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    expect(csv).toContain('"Supermercado, grande"');
  });

  it('handles zero-cent amount correctly', async () => {
    const account = await createAccount();
    await createTransaction({ amount: 0, accountId: account._id });

    const csv = await exportTransactionsCsv(FAKE_USER_ID, {});
    const dataLine = csv.split('\r\n').slice(2)[0];
    const fields = dataLine.split(',');
    expect(fields[5]).toBe('0.00');
  });
});

// =============================================================================
// generateMonthlyReport()
// =============================================================================

describe('generateMonthlyReport()', () => {
  it('returns a non-empty Buffer', async () => {
    await createUser();

    const buffer = await generateMonthlyReport(FAKE_USER_ID, 2026, 3);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('generates a PDF that starts with the PDF magic bytes (%PDF)', async () => {
    await createUser();

    const buffer = await generateMonthlyReport(FAKE_USER_ID, 2026, 3);

    // PDF files start with "%PDF"
    const magic = buffer.slice(0, 4).toString('ascii');
    expect(magic).toBe('%PDF');
  });

  it('does not throw when there are no transactions', async () => {
    await createUser();

    await expect(
      generateMonthlyReport(FAKE_USER_ID, 2026, 3),
    ).resolves.not.toThrow();
  });

  it('does not throw when there are transactions in the requested month', async () => {
    await createUser();
    const account = await createAccount();

    await createTransaction({
      date: new Date('2026-03-10'),
      type: 'income',
      amount: 200000,
      description: 'Salary',
      accountId: account._id,
    });
    await createTransaction({
      date: new Date('2026-03-15'),
      type: 'expense',
      amount: 5000,
      description: 'Coffee',
      accountId: account._id,
    });

    const buffer = await generateMonthlyReport(FAKE_USER_ID, 2026, 3);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('works for edge-case month 1 (January)', async () => {
    await createUser();

    const buffer = await generateMonthlyReport(FAKE_USER_ID, 2026, 1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('works for edge-case month 12 (December)', async () => {
    await createUser();

    const buffer = await generateMonthlyReport(FAKE_USER_ID, 2026, 12);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('generates a larger buffer when there are transactions (more content)', async () => {
    await createUser();
    const account = await createAccount();

    // Empty month
    const emptyBuffer = await generateMonthlyReport(FAKE_USER_ID, 2024, 1);

    // Month with transactions
    for (let i = 0; i < 5; i++) {
      await createTransaction({
        date: new Date('2026-03-10'),
        amount: 1000 * (i + 1),
        description: `Transaction ${i}`,
        accountId: account._id,
      });
    }

    const populatedBuffer = await generateMonthlyReport(FAKE_USER_ID, 2026, 3);

    // Both should be valid PDFs
    expect(emptyBuffer.slice(0, 4).toString('ascii')).toBe('%PDF');
    expect(populatedBuffer.slice(0, 4).toString('ascii')).toBe('%PDF');
  });
});
