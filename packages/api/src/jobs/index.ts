import cron from 'node-cron';
import { scheduleNetWorthSnapshotJob } from './netWorthSnapshot.job.js';
import { scheduleRecurringTransactionsJob } from './recurringTransactions.job.js';
import { schedulePriceUpdateJobs } from './priceUpdate.job.js';
import { startSyncWorker, schedulePeriodicBinanceSync } from './syncQueue.js';
import { scheduleNotificationJobs } from './notifications.job.js';

/**
 * Registers and starts all background cron jobs and BullMQ workers.
 * Call once during application startup (never in test environments).
 */
export function scheduleAllJobs(): void {
  scheduleNetWorthSnapshotJob();
  scheduleRecurringTransactionsJob();
  schedulePriceUpdateJobs();
  scheduleNotificationJobs();

  // Start the BullMQ worker that processes integration sync jobs
  startSyncWorker();

  // Schedule periodic Binance sync — every 30 minutes
  cron.schedule(
    '*/30 * * * *',
    () => {
      void schedulePeriodicBinanceSync();
    },
    { timezone: 'UTC' },
  );
}
