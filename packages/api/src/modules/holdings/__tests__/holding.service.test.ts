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
// Mock external API clients — they must never be called in unit tests
// ---------------------------------------------------------------------------
vi.mock('../integrations/coinmarketcap.client.js', () => ({
  getLatestQuotes: vi.fn().mockResolvedValue({}),
  searchCrypto: vi.fn().mockResolvedValue([]),
}));

vi.mock('../integrations/finnhub.client.js', () => ({
  getQuote: vi.fn().mockResolvedValue(null),
  searchSymbol: vi.fn().mockResolvedValue([]),
  getExchanges: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { AccountModel } from '../../accounts/account.model.js';
import { HoldingModel } from '../holding.model.js';
import {
  getUserHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
  searchTicker,
  importFromCsv,
  getPortfolioSummary,
  HoldingError,
} from '../holding.service.js';
import * as cmcClient from '../integrations/coinmarketcap.client.js';
import * as finnhubClient from '../integrations/finnhub.client.js';

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

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
  await HoldingModel.deleteMany({});
  await AccountModel.deleteMany({});
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeAccount(userId = FAKE_USER_ID) {
  return AccountModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    name: 'Investment Account',
    type: 'investment',
    currency: 'USD',
    currentBalance: 0,
    initialBalance: 0,
    isActive: true,
    includedInNetWorth: true,
  });
}

async function makeHolding(overrides: Partial<{
  userId: string;
  accountId: string;
  symbol: string;
  assetType: 'crypto' | 'stock' | 'etf' | 'bond';
  quantity: string;
  averageBuyPrice: number;
  currentPrice: number;
  currency: string;
}> = {}) {
  const account = await makeAccount(overrides.userId ?? FAKE_USER_ID);
  return HoldingModel.create({
    userId: new mongoose.Types.ObjectId(overrides.userId ?? FAKE_USER_ID),
    accountId: new mongoose.Types.ObjectId(overrides.accountId ?? account._id.toHexString()),
    symbol: overrides.symbol ?? 'BTC',
    assetType: overrides.assetType ?? 'crypto',
    quantity: overrides.quantity ?? '1',
    averageBuyPrice: overrides.averageBuyPrice ?? 3_000_000, // $30,000 in cents
    currentPrice: overrides.currentPrice ?? 4_000_000,       // $40,000 in cents
    priceUpdatedAt: new Date(),
    currency: overrides.currency ?? 'USD',
    source: 'manual',
  });
}

// =============================================================================
// getUserHoldings()
// =============================================================================

describe('getUserHoldings()', () => {
  it('returns empty array when user has no holdings', async () => {
    const holdings = await getUserHoldings(FAKE_USER_ID);
    expect(holdings).toHaveLength(0);
  });

  it('calculates currentValue correctly (quantity * currentPrice)', async () => {
    // quantity = 2, currentPrice = $40,000 = 4_000_000 cents
    // expectedCurrentValue = 2 * 4_000_000 = 8_000_000 cents
    await makeHolding({ quantity: '2', currentPrice: 4_000_000 });

    const holdings = await getUserHoldings(FAKE_USER_ID);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].currentValue).toBe(8_000_000);
  });

  it('calculates totalCost correctly (quantity * averageBuyPrice)', async () => {
    // quantity = 2, averageBuyPrice = $30,000 = 3_000_000 cents
    // expectedTotalCost = 2 * 3_000_000 = 6_000_000 cents
    await makeHolding({ quantity: '2', averageBuyPrice: 3_000_000, currentPrice: 4_000_000 });

    const holdings = await getUserHoldings(FAKE_USER_ID);
    expect(holdings[0].totalCost).toBe(6_000_000);
  });

  it('calculates pnl correctly (currentValue - totalCost)', async () => {
    // quantity = 1, currentPrice = 4_000_000, averageBuyPrice = 3_000_000
    // pnl = 4_000_000 - 3_000_000 = 1_000_000
    await makeHolding({ quantity: '1', averageBuyPrice: 3_000_000, currentPrice: 4_000_000 });

    const holdings = await getUserHoldings(FAKE_USER_ID);
    expect(holdings[0].pnl).toBe(1_000_000);
  });

  it('calculates pnlPercentage correctly', async () => {
    // cost = 3_000_000, value = 4_000_000
    // pnlPct = (1_000_000 / 3_000_000) * 100 = 33.33%
    await makeHolding({ quantity: '1', averageBuyPrice: 3_000_000, currentPrice: 4_000_000 });

    const holdings = await getUserHoldings(FAKE_USER_ID);
    expect(holdings[0].pnlPercentage).toBeCloseTo(33.33, 1);
  });

  it('calculates portfolioPercentage across multiple holdings', async () => {
    // BTC: qty=1, price=4_000_000 → value = 4_000_000
    // ETH: qty=10, price=200_000  → value = 2_000_000
    // total = 6_000_000
    // BTC % = 66.67, ETH % = 33.33
    await makeHolding({ symbol: 'BTC', quantity: '1', currentPrice: 4_000_000, averageBuyPrice: 3_000_000 });
    await makeHolding({ symbol: 'ETH', quantity: '10', currentPrice: 200_000, averageBuyPrice: 150_000, assetType: 'crypto' });

    const holdings = await getUserHoldings(FAKE_USER_ID);
    const btc = holdings.find((h) => h.symbol === 'BTC')!;
    const eth = holdings.find((h) => h.symbol === 'ETH')!;

    expect(btc.portfolioPercentage).toBeCloseTo(66.67, 1);
    expect(eth.portfolioPercentage).toBeCloseTo(33.33, 1);
    expect(btc.portfolioPercentage + eth.portfolioPercentage).toBeCloseTo(100, 1);
  });

  it('handles zero currentPrice (no price yet)', async () => {
    await HoldingModel.create({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      accountId: new mongoose.Types.ObjectId((await makeAccount())._id),
      symbol: 'NEWCOIN',
      assetType: 'crypto',
      quantity: '5',
      averageBuyPrice: 100_00, // 100 USD in cents
      currency: 'USD',
      source: 'manual',
      // No currentPrice set
    });

    const holdings = await getUserHoldings(FAKE_USER_ID);
    expect(holdings[0].currentValue).toBe(0);
    expect(holdings[0].pnl).toBe(Math.round(0 - 5 * 100_00));
    expect(holdings[0].portfolioPercentage).toBe(0);
  });

  it('only returns holdings belonging to the requesting user', async () => {
    await makeHolding({ userId: FAKE_USER_ID, symbol: 'BTC' });
    await makeHolding({ userId: OTHER_USER_ID, symbol: 'ETH' });

    const holdings = await getUserHoldings(FAKE_USER_ID);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].symbol).toBe('BTC');
  });
});

// =============================================================================
// createHolding()
// =============================================================================

describe('createHolding()', () => {
  it('throws ACCOUNT_NOT_FOUND when accountId does not belong to user', async () => {
    const otherAccount = await makeAccount(OTHER_USER_ID);

    const error = await createHolding(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: otherAccount._id.toHexString(),
      assetType: 'crypto',
      symbol: 'BTC',
      quantity: '1',
      averageBuyPrice: 3_000_000,
      currency: 'USD',
      source: 'manual',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HoldingError);
    expect((error as HoldingError).code).toBe('ACCOUNT_NOT_FOUND');
    expect((error as HoldingError).statusCode).toBe(404);
  });

  it('fetches current crypto price from CMC and stores it', async () => {
    vi.mocked(cmcClient.getLatestQuotes).mockResolvedValueOnce({
      BTC: { price: 42_000.5, percent_change_24h: 1.5, last_updated: new Date().toISOString() },
    });

    const account = await makeAccount();
    const holding = await createHolding(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      assetType: 'crypto',
      symbol: 'BTC',
      quantity: '0.5',
      averageBuyPrice: 3_000_000,
      currency: 'USD',
      source: 'manual',
    });

    expect(cmcClient.getLatestQuotes).toHaveBeenCalledWith(['BTC']);
    // price = round(42_000.5 * 100) = 4_200_050 cents
    expect(holding.currentPrice).toBe(4_200_050);
    expect(holding.priceUpdatedAt).toBeInstanceOf(Date);
  });

  it('fetches current stock price from Finnhub and stores it', async () => {
    vi.mocked(finnhubClient.getQuote).mockResolvedValueOnce({
      c: 185.25,
      h: 187.0,
      l: 184.0,
      o: 185.0,
      pc: 184.5,
      t: Date.now(),
    });

    const account = await makeAccount();
    const holding = await createHolding(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      assetType: 'stock',
      symbol: 'AAPL',
      quantity: '10',
      averageBuyPrice: 17_000,
      currency: 'USD',
      source: 'manual',
    });

    expect(finnhubClient.getQuote).toHaveBeenCalledWith('AAPL');
    // price = round(185.25 * 100) = 18_525 cents
    expect(holding.currentPrice).toBe(18_525);
  });

  it('saves holding even when CMC returns no price for the symbol', async () => {
    vi.mocked(cmcClient.getLatestQuotes).mockResolvedValueOnce({});

    const account = await makeAccount();
    const holding = await createHolding(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      assetType: 'crypto',
      symbol: 'OBSCURECOIN',
      quantity: '100',
      averageBuyPrice: 50,
      currency: 'USD',
      source: 'manual',
    });

    expect(holding.currentPrice).toBeUndefined();
    expect(holding.symbol).toBe('OBSCURECOIN');
  });

  it('persists holding with correct fields', async () => {
    vi.mocked(cmcClient.getLatestQuotes).mockResolvedValueOnce({});
    const account = await makeAccount();

    const holding = await createHolding(FAKE_USER_ID, {
      userId: FAKE_USER_ID,
      accountId: account._id.toHexString(),
      assetType: 'crypto',
      symbol: 'eth',
      quantity: '2.5',
      averageBuyPrice: 150_000,
      currency: 'usd',
      source: 'manual',
    });

    expect(holding.symbol).toBe('ETH');           // uppercased
    expect(holding.currency).toBe('USD');         // uppercased
    expect(holding.quantity).toBe('2.5');
    expect(holding.userId.toHexString()).toBe(FAKE_USER_ID);
  });
});

// =============================================================================
// importFromCsv()
// =============================================================================

describe('importFromCsv()', () => {
  const DEGIRO_CSV = `Producto,Símbolo/ISIN,Bolsa,Cantidad,Precio de cierre,Divisa
Apple Inc,AAPL/US0378331005,NASDAQ,10,185.50,USD
Tesla Inc,TSLA/US88160R1014,NASDAQ,5,200.00,USD`;

  const ETORO_CSV = `Ticker,Nombre,Unidades,Precio de compra,Divisa
AAPL,Apple Inc,10,185.50,USD
TSLA,Tesla Inc,5,200.00,USD`;

  const GENERIC_CSV = `symbol,quantity,averageBuyPrice,currency
AAPL,10,185.50,USD
BTC,0.5,42000.00,USD`;

  it('auto-detects DeGiro format and imports rows', async () => {
    const account = await makeAccount();
    const result = await importFromCsv(FAKE_USER_ID, account._id.toHexString(), DEGIRO_CSV);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);

    const holdings = await HoldingModel.find({ userId: new mongoose.Types.ObjectId(FAKE_USER_ID) });
    expect(holdings).toHaveLength(2);
    expect(holdings.map((h) => h.symbol).sort()).toEqual(['AAPL', 'TSLA']);
  });

  it('auto-detects eToro format and imports rows', async () => {
    const account = await makeAccount();
    const result = await importFromCsv(FAKE_USER_ID, account._id.toHexString(), ETORO_CSV);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('auto-detects generic format and imports rows', async () => {
    const account = await makeAccount();
    const result = await importFromCsv(FAKE_USER_ID, account._id.toHexString(), GENERIC_CSV);

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('performs upsert with weighted-average price when symbol already exists', async () => {
    const account = await makeAccount();

    // First import: 10 shares at $185.50 → cost basis = 10 * 18550 = 185500 cents
    await importFromCsv(FAKE_USER_ID, account._id.toHexString(), DEGIRO_CSV);

    // Second import of same symbol: 5 more shares at $200.00
    // Weighted avg = (10*18550 + 5*20000) / 15 = (185500 + 100000) / 15 = 285500 / 15 = 19033.33 → 19033 cents
    const secondCsv = `Producto,Símbolo/ISIN,Bolsa,Cantidad,Precio de cierre,Divisa
Apple Inc,AAPL/US0378331005,NASDAQ,5,200.00,USD`;

    const result = await importFromCsv(FAKE_USER_ID, account._id.toHexString(), secondCsv);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.errors).toHaveLength(0);

    const holding = await HoldingModel.findOne({
      userId: new mongoose.Types.ObjectId(FAKE_USER_ID),
      symbol: 'AAPL',
    });

    expect(holding).not.toBeNull();
    expect(holding!.quantity).toBe('15');
    // Weighted average: round((10*18550 + 5*20000) / 15) = round(19033.33) = 19033
    expect(holding!.averageBuyPrice).toBe(19033);
  });

  it('returns errors for rows with invalid quantity', async () => {
    const account = await makeAccount();
    const badCsv = `symbol,quantity,averageBuyPrice,currency
AAPL,not_a_number,185.50,USD
TSLA,5,200.00,USD`;

    const result = await importFromCsv(FAKE_USER_ID, account._id.toHexString(), badCsv);

    expect(result.created).toBe(1); // TSLA succeeds
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('AAPL');
  });

  it('returns errors for rows with missing symbol', async () => {
    const account = await makeAccount();
    const badCsv = `symbol,quantity,averageBuyPrice,currency
,10,185.50,USD
TSLA,5,200.00,USD`;

    const result = await importFromCsv(FAKE_USER_ID, account._id.toHexString(), badCsv);

    expect(result.created).toBe(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('throws ACCOUNT_NOT_FOUND when accountId belongs to another user', async () => {
    const otherAccount = await makeAccount(OTHER_USER_ID);

    const error = await importFromCsv(
      FAKE_USER_ID,
      otherAccount._id.toHexString(),
      GENERIC_CSV,
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HoldingError);
    expect((error as HoldingError).code).toBe('ACCOUNT_NOT_FOUND');
  });

  it('returns error message for completely invalid CSV', async () => {
    const account = await makeAccount();
    const result = await importFromCsv(
      FAKE_USER_ID,
      account._id.toHexString(),
      'not,valid\x00csv\x00content@@@@',
    );

    // Either parse error or 0 created with some kind of message
    expect(result.created + result.updated).toBe(0);
  });
});

// =============================================================================
// getPortfolioSummary()
// =============================================================================

describe('getPortfolioSummary()', () => {
  it('returns zero totals when user has no holdings', async () => {
    const summary = await getPortfolioSummary(FAKE_USER_ID);
    expect(summary.totalValue).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(summary.totalPnl).toBe(0);
    expect(summary.byAssetType).toHaveLength(0);
    expect(summary.topHoldings).toHaveLength(0);
  });

  it('aggregates totalValue and totalCost correctly', async () => {
    // BTC: qty=1, price=4_000_000, cost=3_000_000
    // ETH: qty=10, price=200_000, cost=150_000
    await makeHolding({ symbol: 'BTC', quantity: '1', currentPrice: 4_000_000, averageBuyPrice: 3_000_000, assetType: 'crypto' });
    await makeHolding({ symbol: 'ETH', quantity: '10', currentPrice: 200_000, averageBuyPrice: 150_000, assetType: 'crypto' });

    const summary = await getPortfolioSummary(FAKE_USER_ID);

    // BTC value = 4_000_000, ETH value = 2_000_000 → total = 6_000_000
    expect(summary.totalValue).toBe(6_000_000);
    // BTC cost = 3_000_000, ETH cost = 1_500_000 → total = 4_500_000
    expect(summary.totalCost).toBe(4_500_000);
    expect(summary.totalPnl).toBe(1_500_000);
  });

  it('groups holdings by assetType correctly', async () => {
    await makeHolding({ symbol: 'BTC', assetType: 'crypto', quantity: '1', currentPrice: 4_000_000, averageBuyPrice: 3_000_000 });
    await makeHolding({ symbol: 'AAPL', assetType: 'stock', quantity: '10', currentPrice: 20_000, averageBuyPrice: 18_000 });

    const summary = await getPortfolioSummary(FAKE_USER_ID);

    const cryptoBucket = summary.byAssetType.find((b) => b.type === 'crypto');
    const stockBucket = summary.byAssetType.find((b) => b.type === 'stock');

    expect(cryptoBucket).toBeDefined();
    expect(stockBucket).toBeDefined();
    expect(cryptoBucket!.value).toBe(4_000_000);
    expect(stockBucket!.value).toBe(200_000);

    // Percentages should sum to 100
    const total = cryptoBucket!.percentage + stockBucket!.percentage;
    expect(total).toBeCloseTo(100, 1);
  });

  it('returns top 5 holdings by currentValue', async () => {
    // Create 7 holdings with distinct values
    const values = [1_000, 5_000, 3_000, 8_000, 2_000, 6_000, 4_000];
    const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    for (let i = 0; i < 7; i++) {
      await makeHolding({
        symbol: symbols[i],
        quantity: '1',
        currentPrice: values[i],
        averageBuyPrice: values[i],
        assetType: 'stock',
      });
    }

    const summary = await getPortfolioSummary(FAKE_USER_ID);
    expect(summary.topHoldings).toHaveLength(5);

    // Top 5 by value desc: D(8000), F(6000), B(5000), G(4000), C(3000)
    expect(summary.topHoldings[0].currentValue).toBe(8_000);
    expect(summary.topHoldings[1].currentValue).toBe(6_000);
    expect(summary.topHoldings[2].currentValue).toBe(5_000);
    expect(summary.topHoldings[3].currentValue).toBe(4_000);
    expect(summary.topHoldings[4].currentValue).toBe(3_000);
  });

  it('computes totalPnlPercentage correctly', async () => {
    // cost = 3_000_000, value = 4_000_000
    // pnlPct = (1_000_000 / 3_000_000) * 100 ≈ 33.33
    await makeHolding({ quantity: '1', currentPrice: 4_000_000, averageBuyPrice: 3_000_000 });

    const summary = await getPortfolioSummary(FAKE_USER_ID);
    expect(summary.totalPnlPercentage).toBeCloseTo(33.33, 1);
  });
});

// =============================================================================
// searchTicker()
// =============================================================================

describe('searchTicker()', () => {
  it('delegates crypto search to CMC client', async () => {
    vi.mocked(cmcClient.searchCrypto).mockResolvedValueOnce([
      { id: 1, name: 'Bitcoin', symbol: 'BTC', slug: 'bitcoin' },
    ]);

    const results = await searchTicker('bit', 'crypto');

    expect(cmcClient.searchCrypto).toHaveBeenCalledWith('bit');
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe('BTC');
    expect(results[0].type).toBe('crypto');
  });

  it('delegates stock search to Finnhub client', async () => {
    vi.mocked(finnhubClient.searchSymbol).mockResolvedValueOnce([
      { description: 'Apple Inc', displaySymbol: 'AAPL', symbol: 'AAPL', type: 'Common Stock' },
    ]);

    const results = await searchTicker('apple', 'stock');

    expect(finnhubClient.searchSymbol).toHaveBeenCalledWith('apple');
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe('AAPL');
    expect(results[0].name).toBe('Apple Inc');
  });

  it('returns empty array when CMC returns no results', async () => {
    vi.mocked(cmcClient.searchCrypto).mockResolvedValueOnce([]);
    const results = await searchTicker('xyz123', 'crypto');
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// deleteHolding()
// =============================================================================

describe('deleteHolding()', () => {
  it('deletes a holding owned by the user', async () => {
    const holding = await makeHolding();
    await deleteHolding(FAKE_USER_ID, holding._id.toHexString());

    const found = await HoldingModel.findById(holding._id);
    expect(found).toBeNull();
  });

  it('throws HOLDING_NOT_FOUND when holding does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await deleteHolding(FAKE_USER_ID, fakeId).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HoldingError);
    expect((error as HoldingError).code).toBe('HOLDING_NOT_FOUND');
    expect((error as HoldingError).statusCode).toBe(404);
  });

  it('cannot delete another user\'s holding', async () => {
    const holding = await makeHolding({ userId: OTHER_USER_ID });
    const error = await deleteHolding(FAKE_USER_ID, holding._id.toHexString()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HoldingError);
    expect((error as HoldingError).code).toBe('HOLDING_NOT_FOUND');
  });
});

// =============================================================================
// updateHolding()
// =============================================================================

describe('updateHolding()', () => {
  it('updates mutable fields on an existing holding', async () => {
    const holding = await makeHolding({ quantity: '1', averageBuyPrice: 3_000_000 });
    const updated = await updateHolding(FAKE_USER_ID, holding._id.toHexString(), {
      quantity: '2',
      averageBuyPrice: 3_100_000,
    });

    expect(updated.quantity).toBe('2');
    expect(updated.averageBuyPrice).toBe(3_100_000);
  });

  it('throws HOLDING_NOT_FOUND for a non-existent holding', async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const error = await updateHolding(FAKE_USER_ID, fakeId, { quantity: '5' }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(HoldingError);
    expect((error as HoldingError).code).toBe('HOLDING_NOT_FOUND');
  });

  it('validates account ownership when accountId changes', async () => {
    const holding = await makeHolding();
    const otherAccount = await makeAccount(OTHER_USER_ID);

    const error = await updateHolding(FAKE_USER_ID, holding._id.toHexString(), {
      accountId: otherAccount._id.toHexString(),
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HoldingError);
    expect((error as HoldingError).code).toBe('ACCOUNT_NOT_FOUND');
  });
});
