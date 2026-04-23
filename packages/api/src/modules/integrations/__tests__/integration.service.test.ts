import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ---------------------------------------------------------------------------
// Mock Redis before any module that imports it
// ---------------------------------------------------------------------------
vi.mock('../../../config/redis.js', async () => {
  const { default: IORedisMock } = await import('ioredis-mock');
  const instance = new IORedisMock();
  return {
    getRedisClient: () => instance,
    createRedisClient: () => instance,
    closeRedisClient: async (): Promise<void> => undefined,
  };
});

// ---------------------------------------------------------------------------
// Mock BullMQ — no real Redis queue in unit tests
// ---------------------------------------------------------------------------
vi.mock('../../../jobs/syncQueue.js', () => ({
  syncQueue: {
    add: vi.fn().mockResolvedValue({ id: 'test-job-id' }),
    getWaiting: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
  },
  QUEUE_NAME: 'integrations-sync',
}));

// ---------------------------------------------------------------------------
// Mock BinanceClient
// ---------------------------------------------------------------------------
vi.mock('../binance/binance.client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../binance/binance.client.js')>();

  const mockTestConnectivity = vi.fn().mockResolvedValue(true);
  const mockGetSpotBalances = vi.fn().mockResolvedValue([]);
  const mockGetMyTrades = vi.fn().mockResolvedValue([]);

  const MockBinanceClient = vi.fn().mockImplementation(() => ({
    testConnectivity: mockTestConnectivity,
    getSpotBalances: mockGetSpotBalances,
    getMyTrades: mockGetMyTrades,
  }));

  return {
    ...actual,
    BinanceClient: MockBinanceClient,
    __mocks: { mockTestConnectivity, mockGetSpotBalances, mockGetMyTrades },
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import {
  connectBinance,
  getIntegrations,
  disconnectIntegration,
  triggerManualSync,
  syncBinance,
  IntegrationError,
} from '../integration.service.js';
import { IntegrationCredentialsModel } from '../integrationCredentials.model.js';
import { AccountModel } from '../../accounts/account.model.js';
import { HoldingModel } from '../../holdings/holding.model.js';
import { TransactionModel } from '../../transactions/transaction.model.js';
import { AuditLogModel } from '../../audit/auditLog.model.js';
import * as binanceClientModule from '../binance/binance.client.js';
import { syncQueue } from '../../../jobs/syncQueue.js';
import * as cryptoUtils from '../../../utils/crypto.js';

// ---------------------------------------------------------------------------
// Helpers to access mocked BinanceClient methods
// ---------------------------------------------------------------------------
function getMocks() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (binanceClientModule as any).__mocks as {
    mockTestConnectivity: ReturnType<typeof vi.fn>;
    mockGetSpotBalances: ReturnType<typeof vi.fn>;
    mockGetMyTrades: ReturnType<typeof vi.fn>;
  };
  return m;
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

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
  await IntegrationCredentialsModel.deleteMany({});
  await AccountModel.deleteMany({});
  await HoldingModel.deleteMany({});
  await TransactionModel.deleteMany({});
  await AuditLogModel.deleteMany({});
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Seeds a Binance credential in the DB, already encrypted. */
async function seedBinanceCredential(userId = FAKE_USER_ID) {
  // Use real encrypt so decrypt works during syncBinance
  const { encryptedData, iv } = cryptoUtils.encrypt(
    JSON.stringify({ apiKey: 'test-api-key', apiSecret: 'test-api-secret' }),
  );

  return IntegrationCredentialsModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    provider: 'binance',
    encryptedPayload: encryptedData,
    iv,
    isActive: true,
    lastSyncStatus: 'never',
  });
}

// =============================================================================
// connectBinance()
// =============================================================================

describe('connectBinance()', () => {
  it('creates a credential record when testConnectivity returns true', async () => {
    getMocks().mockTestConnectivity.mockResolvedValueOnce(true);

    await connectBinance(FAKE_USER_ID, 'valid-key', 'valid-secret');

    const cred = await IntegrationCredentialsModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      provider: 'binance',
    }).lean();

    expect(cred).not.toBeNull();
    expect(cred!.isActive).toBe(true);
    expect(cred!.lastSyncStatus).toBe('pending');
    // Credentials must be stored encrypted — never in plain text
    expect(cred!.encryptedPayload).not.toContain('valid-key');
    expect(cred!.encryptedPayload).not.toContain('valid-secret');
  });

  it('throws BINANCE_INVALID_CREDENTIALS when testConnectivity returns false', async () => {
    getMocks().mockTestConnectivity.mockResolvedValueOnce(false);

    const err = await connectBinance(FAKE_USER_ID, 'bad-key', 'bad-secret').catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(IntegrationError);
    expect((err as IntegrationError).code).toBe('BINANCE_INVALID_CREDENTIALS');
    expect((err as IntegrationError).statusCode).toBe(401);
  });

  it('does not persist credentials when validation fails', async () => {
    getMocks().mockTestConnectivity.mockResolvedValueOnce(false);

    await connectBinance(FAKE_USER_ID, 'bad-key', 'bad-secret').catch(() => undefined);

    const count = await IntegrationCredentialsModel.countDocuments({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
    });

    expect(count).toBe(0);
  });

  it('performs upsert — reconnecting overwrites the existing record', async () => {
    getMocks().mockTestConnectivity.mockResolvedValue(true);

    await connectBinance(FAKE_USER_ID, 'key-1', 'secret-1');
    await connectBinance(FAKE_USER_ID, 'key-2', 'secret-2');

    const count = await IntegrationCredentialsModel.countDocuments({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      provider: 'binance',
    });

    expect(count).toBe(1);
  });

  it('enqueues an initial sync job after connecting', async () => {
    getMocks().mockTestConnectivity.mockResolvedValueOnce(true);

    await connectBinance(FAKE_USER_ID, 'valid-key', 'valid-secret');

    expect(syncQueue.add).toHaveBeenCalledWith(
      'binance-initial-sync',
      expect.objectContaining({ userId: FAKE_USER_ID, provider: 'binance' }),
      expect.objectContaining({ priority: 1 }),
    );
  });

  it('writes an audit log entry', async () => {
    getMocks().mockTestConnectivity.mockResolvedValueOnce(true);

    await connectBinance(FAKE_USER_ID, 'valid-key', 'valid-secret');

    const log = await AuditLogModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      action: 'integration_add',
    }).lean();

    expect(log).not.toBeNull();
    expect(log!.metadata).toEqual({ provider: 'binance' });
  });
});

// =============================================================================
// getIntegrations()
// =============================================================================

describe('getIntegrations()', () => {
  it('returns empty array when user has no integrations', async () => {
    const result = await getIntegrations(FAKE_USER_ID);
    expect(result).toHaveLength(0);
  });

  it('returns integration status without credential fields', async () => {
    await seedBinanceCredential();

    const result = await getIntegrations(FAKE_USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe('binance');
    expect(result[0].connected).toBe(true);
    expect(result[0].lastSyncStatus).toBe('never');

    // Security: no raw credential data must be returned
    const keys = Object.keys(result[0]);
    expect(keys).not.toContain('encryptedPayload');
    expect(keys).not.toContain('iv');
    expect(keys).not.toContain('apiKey');
    expect(keys).not.toContain('apiSecret');
  });

  it('does not return inactive integrations', async () => {
    await IntegrationCredentialsModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      provider: 'binance',
      encryptedPayload: 'xxx',
      iv: 'yyy',
      isActive: false,
      lastSyncStatus: 'never',
    });

    const result = await getIntegrations(FAKE_USER_ID);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// disconnectIntegration()
// =============================================================================

describe('disconnectIntegration()', () => {
  it('sets isActive to false for the given provider', async () => {
    await seedBinanceCredential();

    await disconnectIntegration(FAKE_USER_ID, 'binance');

    const cred = await IntegrationCredentialsModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      provider: 'binance',
    }).lean();

    expect(cred).not.toBeNull();
    expect(cred!.isActive).toBe(false);
  });

  it('throws INTEGRATION_NOT_FOUND when no active integration exists', async () => {
    const err = await disconnectIntegration(FAKE_USER_ID, 'binance').catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(IntegrationError);
    expect((err as IntegrationError).code).toBe('INTEGRATION_NOT_FOUND');
    expect((err as IntegrationError).statusCode).toBe(404);
  });

  it('writes an audit log entry on disconnect', async () => {
    await seedBinanceCredential();

    await disconnectIntegration(FAKE_USER_ID, 'binance');

    const log = await AuditLogModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      action: 'integration_remove',
    }).lean();

    expect(log).not.toBeNull();
    expect(log!.metadata).toEqual({ provider: 'binance' });
  });
});

// =============================================================================
// triggerManualSync()
// =============================================================================

describe('triggerManualSync()', () => {
  it('enqueues a high-priority job and returns jobId', async () => {
    await seedBinanceCredential();
    vi.mocked(syncQueue.add).mockResolvedValueOnce({ id: 'manual-job-123' } as never);

    const result = await triggerManualSync(FAKE_USER_ID, 'binance');

    expect(result.jobId).toBe('manual-job-123');
    expect(syncQueue.add).toHaveBeenCalledWith(
      'binance-manual-sync',
      expect.objectContaining({ triggeredBy: 'manual' }),
      expect.objectContaining({ priority: 1 }),
    );
  });

  it('throws INTEGRATION_NOT_FOUND when integration is not connected', async () => {
    const err = await triggerManualSync(FAKE_USER_ID, 'binance').catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(IntegrationError);
    expect((err as IntegrationError).code).toBe('INTEGRATION_NOT_FOUND');
  });

  it('throws UNSUPPORTED_PROVIDER for unknown providers', async () => {
    const err = await triggerManualSync(FAKE_USER_ID, 'unknown_provider').catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(IntegrationError);
    expect((err as IntegrationError).code).toBe('UNSUPPORTED_PROVIDER');
  });
});

// =============================================================================
// syncBinance()
// =============================================================================

describe('syncBinance()', () => {
  it('throws INTEGRATION_NOT_FOUND when no active credential exists', async () => {
    const err = await syncBinance(FAKE_USER_ID).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(IntegrationError);
    expect((err as IntegrationError).code).toBe('INTEGRATION_NOT_FOUND');
  });

  it('creates a Binance account when none exists', async () => {
    await seedBinanceCredential();
    getMocks().mockGetSpotBalances.mockResolvedValueOnce([]);
    getMocks().mockGetMyTrades.mockResolvedValueOnce([]);

    await syncBinance(FAKE_USER_ID);

    const account = await AccountModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      name: 'Binance',
      type: 'crypto',
    }).lean();

    expect(account).not.toBeNull();
  });

  it('reuses an existing Binance account instead of creating a duplicate', async () => {
    await AccountModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      name: 'Binance',
      type: 'crypto',
      currency: 'USDT',
      currentBalance: 0,
      initialBalance: 0,
      isActive: true,
      includedInNetWorth: true,
    });

    await seedBinanceCredential();
    getMocks().mockGetSpotBalances.mockResolvedValueOnce([]);

    await syncBinance(FAKE_USER_ID);

    const count = await AccountModel.countDocuments({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      name: 'Binance',
    });

    expect(count).toBe(1);
  });

  it('upserts holdings from spot balances', async () => {
    await seedBinanceCredential();

    getMocks().mockGetSpotBalances.mockResolvedValueOnce([
      { asset: 'BTC', free: '0.5', locked: '0.1' },
      { asset: 'ETH', free: '2.0', locked: '0.0' },
    ]);
    getMocks().mockGetMyTrades.mockResolvedValue([]);

    await syncBinance(FAKE_USER_ID);

    const holdings = await HoldingModel.find({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      source: 'binance',
    }).lean();

    expect(holdings).toHaveLength(2);

    const btc = holdings.find((h) => h.symbol === 'BTC');
    const eth = holdings.find((h) => h.symbol === 'ETH');

    expect(btc).toBeDefined();
    expect(btc!.quantity).toBe('0.6'); // 0.5 + 0.1
    expect(eth).toBeDefined();
    expect(eth!.quantity).toBe('2');
  });

  it('filters out assets below minimum balance threshold', async () => {
    await seedBinanceCredential();

    getMocks().mockGetSpotBalances.mockResolvedValueOnce([
      { asset: 'BTC', free: '0.0000001', locked: '0.0000001' }, // below 0.000001 threshold
      { asset: 'ETH', free: '1.0', locked: '0.0' },
    ]);
    getMocks().mockGetMyTrades.mockResolvedValue([]);

    await syncBinance(FAKE_USER_ID);

    const holdings = await HoldingModel.find({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      source: 'binance',
    }).lean();

    expect(holdings).toHaveLength(1);
    expect(holdings[0].symbol).toBe('ETH');
  });

  it('inserts new trades as transactions', async () => {
    await seedBinanceCredential();

    getMocks().mockGetSpotBalances.mockResolvedValueOnce([
      { asset: 'BTC', free: '0.5', locked: '0.0' },
    ]);

    const fakeTrade = {
      id: 1001,
      symbol: 'BTCUSDT',
      orderId: 5555,
      orderListId: -1,
      price: '30000.00',
      qty: '0.5',
      quoteQty: '15000.00',
      commission: '15.00',
      commissionAsset: 'USDT',
      time: Date.now(),
      isBuyer: true,
      isMaker: false,
      isBestMatch: true,
    };

    getMocks().mockGetMyTrades.mockResolvedValueOnce([fakeTrade]);

    await syncBinance(FAKE_USER_ID);

    const tx = await TransactionModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      externalId: '1001',
      source: 'binance',
    }).lean();

    expect(tx).not.toBeNull();
    expect(tx!.type).toBe('expense'); // buy = expense (funds out)
    expect(tx!.amount).toBe(1_500_000); // 15000 * 100 cents
    expect(tx!.currency).toBe('USDT');
  });

  it('deduplicates trades by externalId — does not insert duplicates', async () => {
    await seedBinanceCredential();

    getMocks().mockGetSpotBalances.mockResolvedValue([
      { asset: 'BTC', free: '0.5', locked: '0.0' },
    ]);

    const fakeTrade = {
      id: 2001,
      symbol: 'BTCUSDT',
      orderId: 6666,
      orderListId: -1,
      price: '31000.00',
      qty: '0.5',
      quoteQty: '15500.00',
      commission: '15.50',
      commissionAsset: 'USDT',
      time: Date.now(),
      isBuyer: false,
      isMaker: true,
      isBestMatch: true,
    };

    getMocks().mockGetMyTrades.mockResolvedValue([fakeTrade]);

    // Run sync twice
    await syncBinance(FAKE_USER_ID);
    await syncBinance(FAKE_USER_ID);

    const count = await TransactionModel.countDocuments({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      externalId: '2001',
      source: 'binance',
    });

    expect(count).toBe(1);
  });

  it('maps sell trades as income transactions', async () => {
    await seedBinanceCredential();

    getMocks().mockGetSpotBalances.mockResolvedValueOnce([
      { asset: 'ETH', free: '2.0', locked: '0.0' },
    ]);

    const sellTrade = {
      id: 3001,
      symbol: 'ETHUSDT',
      orderId: 7777,
      orderListId: -1,
      price: '2000.00',
      qty: '1.0',
      quoteQty: '2000.00',
      commission: '2.00',
      commissionAsset: 'USDT',
      time: Date.now(),
      isBuyer: false,
      isMaker: false,
      isBestMatch: true,
    };

    getMocks().mockGetMyTrades.mockResolvedValueOnce([sellTrade]);

    await syncBinance(FAKE_USER_ID);

    const tx = await TransactionModel.findOne({
      externalId: '3001',
      source: 'binance',
    }).lean();

    expect(tx).not.toBeNull();
    expect(tx!.type).toBe('income'); // sell = income (funds in)
  });

  it('updates lastSyncAt and lastSyncStatus to success on completion', async () => {
    await seedBinanceCredential();

    getMocks().mockGetSpotBalances.mockResolvedValueOnce([]);
    getMocks().mockGetMyTrades.mockResolvedValueOnce([]);

    const before = new Date();
    await syncBinance(FAKE_USER_ID);

    const cred = await IntegrationCredentialsModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      provider: 'binance',
    }).lean();

    expect(cred!.lastSyncStatus).toBe('success');
    expect(cred!.lastSyncAt).toBeInstanceOf(Date);
    expect(cred!.lastSyncAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(cred!.lastSyncError).toBeUndefined();
  });

  it('updates lastSyncStatus to error when sync fails', async () => {
    await seedBinanceCredential();

    getMocks().mockGetSpotBalances.mockRejectedValueOnce(
      new Error('Network timeout'),
    );

    await syncBinance(FAKE_USER_ID).catch(() => undefined);

    const cred = await IntegrationCredentialsModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      provider: 'binance',
    }).lean();

    expect(cred!.lastSyncStatus).toBe('error');
    expect(cred!.lastSyncError).toContain('Network timeout');
  });
});
