import pino from 'pino';

const logger = pino({ name: 'job.notifications' });

/**
 * Schedules notification jobs.
 */
export function scheduleNotificationJobs(): void {
  logger.info('Notifications job initialized');
}
