import { Queue, Worker, type Job } from 'bullmq';
import pino from 'pino';
import { getRedisClient } from '../config/redis.js';
import { IntegrationCredentialsModel } from '../modules/integrations/integrationCredentials.model.js';

const logger = pino({ name: 'job.syncQueue' });

export const QUEUE_NAME = 'integrations-sync';

// ---------------------------------------------------------------------------
// Job data type
// ---------------------------------------------------------------------------

export interface SyncJobData {
  userId: string;
  provider: 'binance';
  triggeredBy: 'manual' | 'schedule';
}

// ---------------------------------------------------------------------------
// Queue definition
// ---------------------------------------------------------------------------

export const syncQueue = new Queue<SyncJobData>(QUEUE_NAME, {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5_000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export function startSyncWorker(): Worker<SyncJobData> {
  const worker = new Worker<SyncJobData>(
    QUEUE_NAME,
    async (job: Job<SyncJobData>) => {
      const { userId, provider } = job.data;

      logger.info({ jobId: job.id, userId, provider }, 'Processing sync job');

      if (provider === 'binance') {
        // Lazy import to avoid circular dependency at module init time
        const { syncBinance } = await import('../modules/integrations/integration.service.js');
        await syncBinance(userId);
      } else {
        logger.warn({ provider }, 'No handler registered for provider — skipping');
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 5,
    },
  );

  worker.on('completed', (job: Job<SyncJobData>) => {
    logger.info({ jobId: job.id, userId: job.data.userId }, 'Sync job completed');
  });

  worker.on('failed', (job: Job<SyncJobData> | undefined, err: Error) => {
    logger.error(
      { jobId: job?.id, userId: job?.data.userId, err: err.message },
      'Sync job failed',
    );
  });

  logger.info('Sync worker started');
  return worker;
}

// ---------------------------------------------------------------------------
// Periodic Binance sync scheduler
// ---------------------------------------------------------------------------

/**
 * Enqueues a sync job for every user with an active Binance integration.
 * Jobs are staggered by 200 ms per user to avoid hammering Binance.
 */
export async function schedulePeriodicBinanceSync(): Promise<void> {
  logger.info('Scheduling periodic Binance sync for all active users');

  try {
    const credentials = await IntegrationCredentialsModel.find({
      provider: 'binance',
      isActive: true,
    })
      .select('userId')
      .lean()
      .exec();

    if (credentials.length === 0) {
      logger.info('No active Binance integrations found — skipping periodic sync');
      return;
    }

    for (let i = 0; i < credentials.length; i++) {
      const userId = credentials[i].userId.toHexString();
      const delay = i * 200; // 200 ms stagger between users

      await syncQueue.add(
        'binance-periodic-sync',
        { userId, provider: 'binance', triggeredBy: 'schedule' },
        { delay, priority: 10 },
      );
    }

    logger.info(
      { totalUsers: credentials.length },
      'Periodic Binance sync jobs enqueued',
    );
  } catch (err) {
    logger.error({ err }, 'Failed to schedule periodic Binance sync');
  }
}
