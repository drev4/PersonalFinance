import cron from 'node-cron';
import pino from 'pino';
import { takeSnapshotsForAllUsers } from '../modules/dashboard/dashboard.service.js';

const logger = pino({ name: 'job.netWorthSnapshot' });

/**
 * Schedules the daily net worth snapshot job.
 * Runs every day at 00:05 UTC.
 */
export function scheduleNetWorthSnapshotJob(): void {
  cron.schedule(
    '5 0 * * *',
    async () => {
      logger.info('Starting daily net worth snapshot job');
      try {
        const result = await takeSnapshotsForAllUsers();
        logger.info(
          { success: result.success, errors: result.errors },
          'Daily net worth snapshot job completed',
        );
      } catch (err) {
        logger.error({ err }, 'Fatal error in net worth snapshot job');
      }
    },
    { timezone: 'UTC' },
  );

  logger.info('Net worth snapshot job scheduled (5 0 * * * UTC)');
}
