import mongoose from 'mongoose';
import pino from 'pino';
import { BinanceClient, BinanceApiError } from './binance/binance.client.js';
import {
  IntegrationCredentialsModel,
  type IIntegrationCredentials,
} from './integrationCredentials.model.js';
import { AccountModel } from '../accounts/account.model.js';
import { HoldingModel } from '../holdings/holding.model.js';
import { TransactionModel } from '../transactions/transaction.model.js';
import { AuditLogModel } from '../audit/auditLog.model.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { getRedisClient } from '../../config/redis.js';
import { syncQueue } from '../../jobs/syncQueue.js';

const logger = pino({ name: 'integration.service' });

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IntegrationStatus {
  provider: string;
  connected: boolean;
  lastSyncAt?: Date;
  lastSyncStatus: string;
  lastSyncError?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildLastTradeKey(userId: string, asset: string): string {
  return `binance:last_trade:${userId}:${asset}`;
}

async function findOrCreateBinanceAccount(userId: string): Promise<mongoose.Types.ObjectId> {
  const existing = await AccountModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    name: 'Binance',
    type: 'crypto',
  }).exec();

  if (existing !== null) {
    return existing._id;
  }

  const created = await AccountModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    name: 'Binance',
    type: 'crypto',
    currency: 'USDT',
    currentBalance: 0,
    initialBalance: 0,
    isActive: true,
    includedInNetWorth: true,
  });

  return created._id;
}

async function writeAuditLog(
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await AuditLogModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      action,
      metadata,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log');
  }
}

// ---------------------------------------------------------------------------
// connectBinance
// ---------------------------------------------------------------------------

export class IntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export async function connectBinance(
  userId: string,
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  // Validate credentials against Binance
  const client = new BinanceClient({ apiKey, apiSecret });
  const valid = await client.testConnectivity();

  if (!valid) {
    throw new IntegrationError(
      'BINANCE_INVALID_CREDENTIALS',
      'The provided Binance API credentials are invalid or do not have the required permissions.',
      401,
    );
  }

  // Encrypt credentials before storage — never persist raw keys
  const { encryptedData, iv } = encrypt(JSON.stringify({ apiKey, apiSecret }));

  await IntegrationCredentialsModel.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      provider: 'binance',
    },
    {
      $set: {
        encryptedPayload: encryptedData,
        iv,
        isActive: true,
        lastSyncStatus: 'pending',
      },
      $unset: { lastSyncError: '' },
    },
    { upsert: true, new: true, runValidators: true },
  ).exec();

  // Audit: record credential addition without sensitive data
  await writeAuditLog(userId, 'integration_add', { provider: 'binance' });

  // Enqueue initial sync
  await syncQueue.add(
    'binance-initial-sync',
    { userId, provider: 'binance', triggeredBy: 'manual' },
    { priority: 1 },
  );

  logger.info({ userId }, 'Binance integration connected — initial sync enqueued');
}

// ---------------------------------------------------------------------------
// getIntegrations
// ---------------------------------------------------------------------------

export async function getIntegrations(userId: string): Promise<IntegrationStatus[]> {
  const credentials = await IntegrationCredentialsModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  })
    .select('provider lastSyncAt lastSyncStatus lastSyncError isActive')
    .lean()
    .exec();

  return credentials.map((c) => ({
    provider: c.provider,
    connected: c.isActive,
    lastSyncAt: c.lastSyncAt,
    lastSyncStatus: c.lastSyncStatus,
    lastSyncError: c.lastSyncError,
  }));
}

// ---------------------------------------------------------------------------
// disconnectIntegration
// ---------------------------------------------------------------------------

export async function disconnectIntegration(
  userId: string,
  provider: string,
): Promise<void> {
  const credential = await IntegrationCredentialsModel.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      provider,
      isActive: true,
    },
    { $set: { isActive: false } },
    { new: true },
  ).exec();

  if (credential === null) {
    throw new IntegrationError(
      'INTEGRATION_NOT_FOUND',
      `No active ${provider} integration found for this user.`,
      404,
    );
  }

  // Cancel pending BullMQ jobs for this user+provider
  try {
    const waiting = await syncQueue.getWaiting();
    const delayed = await syncQueue.getDelayed();

    const toCancel = [...waiting, ...delayed].filter(
      (job) =>
        job.data.userId === userId &&
        job.data.provider === provider,
    );

    await Promise.all(toCancel.map((job) => job.remove()));

    logger.info(
      { userId, provider, cancelledJobs: toCancel.length },
      'Cancelled pending sync jobs after disconnect',
    );
  } catch (err) {
    logger.warn({ err, userId, provider }, 'Failed to cancel pending jobs during disconnect');
  }

  // Audit: record credential removal
  await writeAuditLog(userId, 'integration_remove', { provider });

  logger.info({ userId, provider }, 'Integration disconnected');
}

// ---------------------------------------------------------------------------
// triggerManualSync
// ---------------------------------------------------------------------------

export async function triggerManualSync(
  userId: string,
  provider: string,
): Promise<{ jobId: string }> {
  if (provider !== 'binance') {
    throw new IntegrationError(
      'UNSUPPORTED_PROVIDER',
      `Manual sync is not supported for provider: ${provider}`,
      400,
    );
  }

  const credential = await IntegrationCredentialsModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    provider,
    isActive: true,
  })
    .select('_id')
    .lean()
    .exec();

  if (credential === null) {
    throw new IntegrationError(
      'INTEGRATION_NOT_FOUND',
      `No active ${provider} integration found. Please connect ${provider} first.`,
      404,
    );
  }

  const job = await syncQueue.add(
    'binance-manual-sync',
    { userId, provider: 'binance', triggeredBy: 'manual' },
    { priority: 1 },
  );

  logger.info({ userId, provider, jobId: job.id }, 'Manual sync enqueued');

  return { jobId: job.id ?? '' };
}

// ---------------------------------------------------------------------------
// syncBinance — core synchronisation logic
// ---------------------------------------------------------------------------

export async function syncBinance(userId: string): Promise<void> {
  logger.info({ userId }, 'Starting Binance sync');

  const credentialDoc = await IntegrationCredentialsModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    provider: 'binance',
    isActive: true,
  }).exec();

  if (credentialDoc === null) {
    throw new IntegrationError(
      'INTEGRATION_NOT_FOUND',
      'No active Binance integration found for this user.',
      404,
    );
  }

  try {
    await runBinanceSync(userId, credentialDoc);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error during Binance sync';

    logger.error({ err, userId }, 'Binance sync failed');

    await IntegrationCredentialsModel.findByIdAndUpdate(credentialDoc._id, {
      $set: {
        lastSyncStatus: 'error',
        lastSyncError: errorMessage,
        lastSyncAt: new Date(),
      },
    }).exec();

    throw err;
  }
}

async function runBinanceSync(
  userId: string,
  credentialDoc: IIntegrationCredentials,
): Promise<void> {
  // 1. Decrypt credentials and build client
  const raw = decrypt(credentialDoc.encryptedPayload, credentialDoc.iv);
  const { apiKey, apiSecret } = JSON.parse(raw) as { apiKey: string; apiSecret: string };
  const client = new BinanceClient({ apiKey, apiSecret });

  // 2. Ensure Binance account exists
  const accountId = await findOrCreateBinanceAccount(userId);

  // 3. Sync spot balances → holdings
  const balances = await client.getSpotBalances();
  const MIN_BALANCE = 0.000001;

  const activeAssets: string[] = [];

  for (const balance of balances) {
    const total = parseFloat(balance.free) + parseFloat(balance.locked);
    if (total <= MIN_BALANCE) continue;

    activeAssets.push(balance.asset);

    await HoldingModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        symbol: balance.asset.toUpperCase(),
        source: 'binance',
      },
      {
        $set: {
          userId: new mongoose.Types.ObjectId(userId),
          accountId,
          assetType: 'crypto',
          symbol: balance.asset.toUpperCase(),
          quantity: total.toString(),
          averageBuyPrice: 0,
          currency: 'USDT',
          source: 'binance',
          exchange: 'BINANCE',
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();

    logger.debug({ userId, asset: balance.asset, total }, 'Upserted holding');
  }

  // 4. Sync trades for each active asset
  const redis = getRedisClient();

  for (const asset of activeAssets) {
    // Skip stablecoin pairs — no point importing USDT trades against itself
    if (asset === 'USDT') continue;

    const symbol = `${asset}USDT`;
    const lastTradeKey = buildLastTradeKey(userId, asset);
    const storedLastId = await redis.get(lastTradeKey);
    const fromId = storedLastId !== null ? parseInt(storedLastId, 10) : undefined;

    let trades;
    try {
      trades = await client.getMyTrades(symbol, fromId !== undefined ? fromId + 1 : undefined);
    } catch (err) {
      if (err instanceof BinanceApiError) {
        // Symbol may not trade against USDT — skip gracefully
        logger.warn({ userId, symbol, err: err.message }, 'Could not fetch trades — skipping symbol');
        continue;
      }
      throw err;
    }

    if (trades.length === 0) continue;

    let maxTradeId = fromId ?? 0;

    for (const trade of trades) {
      // Deduplicate by externalId
      const existing = await TransactionModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        externalId: trade.id.toString(),
        source: 'binance',
      })
        .select('_id')
        .lean()
        .exec();

      if (existing !== null) {
        if (trade.id > maxTradeId) maxTradeId = trade.id;
        continue;
      }

      const amount = parseFloat(trade.quoteQty);
      const type = trade.isBuyer ? 'expense' : 'income'; // buy = funds out, sell = funds in

      await TransactionModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        accountId,
        type,
        amount: Math.round(amount * 100), // store in cents
        currency: 'USDT',
        date: new Date(trade.time),
        description: `Binance ${trade.isBuyer ? 'Buy' : 'Sell'} ${trade.qty} ${asset} @ ${trade.price}`,
        source: 'binance',
        externalId: trade.id.toString(),
        tags: ['binance', 'crypto', asset.toLowerCase()],
      });

      if (trade.id > maxTradeId) maxTradeId = trade.id;
    }

    // Persist the latest processed trade ID
    await redis.set(lastTradeKey, maxTradeId.toString());
    logger.debug({ userId, symbol, tradesProcessed: trades.length, maxTradeId }, 'Trades synced');
  }

  // 5. Mark sync as successful — also clear any previous error message
  await IntegrationCredentialsModel.findByIdAndUpdate(credentialDoc._id, {
    $set: {
      lastSyncAt: new Date(),
      lastSyncStatus: 'success',
    },
    $unset: { lastSyncError: '' },
  }).exec();

  logger.info({ userId, assetsProcessed: activeAssets.length }, 'Binance sync completed successfully');
}
