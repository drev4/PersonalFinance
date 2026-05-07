import cron from 'node-cron';
import pino from 'pino';
import { BudgetModel } from '../modules/budgets/budget.model.js';
import { checkBudgetAlerts } from '../modules/budgets/budget.service.js';
import { NotificationModel } from '../modules/notifications/notification.model.js';
import { createNotification } from '../modules/notifications/notification.service.js';
import { checkAndFireAlerts } from '../modules/holdings/priceAlert.service.js';

const logger = pino({ name: 'job.notifications' });

// ─── Budget alert job ─────────────────────────────────────────────────────────

async function runBudgetAlertJob(): Promise<void> {
  logger.info('Budget alert job started');

  let userIds: unknown[];
  try {
    userIds = await BudgetModel.distinct('userId', { isActive: true }).exec();
  } catch (err) {
    logger.error({ err }, 'Failed to fetch users with active budgets');
    return;
  }

  let notified = 0;

  for (const userId of userIds) {
    const userIdStr = String(userId);

    try {
      const alerts = await checkBudgetAlerts(userIdStr);
      if (alerts.length === 0) continue;

      // Deduplicate: skip if we already sent a budget alert in the last 20 hours
      const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
      const alreadySent = await NotificationModel.exists({
        userId,
        type: { $in: ['budget_warning', 'budget_exceeded'] },
        createdAt: { $gte: since },
      }).exec();

      if (alreadySent) continue;

      const exceeded = alerts.filter((a) => a.status === 'exceeded');
      const hasExceeded = exceeded.length > 0;
      // alerts.length > 0 is guaranteed by the early-continue above
      const first = alerts[0]!;

      const title = hasExceeded
        ? `${exceeded.length} presupuesto${exceeded.length > 1 ? 's' : ''} excedido${
            exceeded.length > 1 ? 's' : ''
          }`
        : 'Alerta de presupuesto';

      const message =
        alerts.length === 1
          ? `${first.budgetName} — ${first.categoryName}: ${first.percentageUsed.toFixed(0)}% usado`
          : `${first.budgetName} — ${first.categoryName}: ${first.percentageUsed.toFixed(
              0,
            )}% usado (+${alerts.length - 1} más)`;

      await createNotification(userIdStr, {
        type: hasExceeded ? 'budget_exceeded' : 'budget_warning',
        title,
        message,
        data: {
          alertCount: alerts.length,
          exceeded: exceeded.length,
          warnings: alerts.length - exceeded.length,
        },
      });

      notified++;
    } catch (err) {
      logger.error({ err, userId: userIdStr }, 'Budget alert check failed for user');
    }
  }

  logger.info({ checked: userIds.length, notified }, 'Budget alert job completed');
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export function scheduleNotificationJobs(): void {
  logger.info('Notifications job initialized');

  // Daily at 9:00 AM UTC
  cron.schedule(
    '0 9 * * *',
    () => {
      void runBudgetAlertJob();
    },
    { timezone: 'UTC' },
  );

  // Every 15 minutes — check price alerts after price updates run
  cron.schedule(
    '*/15 * * * *',
    () => {
      void checkAndFireAlerts().catch((err) => logger.error({ err }, 'Price alert job failed'));
    },
    { timezone: 'UTC' },
  );
}
