import cron from 'node-cron';
import pino from 'pino';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis.js';
import { UserModel } from '../modules/users/user.model.js';
import { TransactionModel } from '../modules/transactions/transaction.model.js';
import { GoalModel } from '../modules/goals/goal.model.js';
import { NotificationModel } from '../modules/notifications/notification.model.js';
import { createNotification } from '../modules/notifications/notification.service.js';
import { checkBudgetAlerts } from '../modules/budgets/budget.service.js';
import {
  sendBudgetAlert,
  sendMonthlyReportEmail,
  sendGoalReachedEmail,
} from '../utils/email.js';
import { generateMonthlyReport } from '../modules/reports/report.service.js';

const logger = pino({ name: 'job.notifications' });

// ---- Helpers -----------------------------------------------------------------

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function eurosCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' €';
}

const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

async function getAllUserIds(): Promise<string[]> {
  const users = await UserModel.find({}).select('_id').lean().exec();
  return users.map((u) => String(u._id));
}

// ============================================================================
// Job 1 — Daily budget alerts (09:00 UTC)
// ============================================================================

async function runBudgetAlertsJob(): Promise<void> {
  logger.info('Starting budget alerts job');
  const redis = getRedisClient();
  const today = todayKey();
  const userIds = await getAllUserIds();

  let alertsSent = 0;
  let errors = 0;

  for (const userId of userIds) {
    try {
      const alerts = await checkBudgetAlerts(userId);

      for (const alert of alerts) {
        const dedupeKey = `budget_alert:${userId}:${alert.budgetId}:${alert.categoryName}:${today}`;
        const alreadySent = await redis.get(dedupeKey);
        if (alreadySent !== null) continue;

        const notificationType =
          alert.status === 'exceeded' ? 'budget_exceeded' : 'budget_warning';

        const title =
          alert.status === 'exceeded'
            ? `Presupuesto excedido: ${alert.categoryName}`
            : `Alerta de presupuesto: ${alert.categoryName}`;

        const message =
          alert.status === 'exceeded'
            ? `Has superado el presupuesto de "${alert.budgetName}" en la categoría "${alert.categoryName}" (${alert.percentageUsed.toFixed(1)}% usado).`
            : `Tu presupuesto de "${alert.budgetName}" en la categoría "${alert.categoryName}" está al ${alert.percentageUsed.toFixed(1)}%.`;

        await createNotification(userId, {
          type: notificationType,
          title,
          message,
          data: {
            budgetId: alert.budgetId,
            budgetName: alert.budgetName,
            categoryName: alert.categoryName,
            percentageUsed: alert.percentageUsed,
          },
        });

        // Mark deduplication key with 24-hour TTL
        await redis.set(dedupeKey, '1', 'EX', 86400);

        // Send email if user has notifications enabled
        try {
          const user = await UserModel.findById(userId)
            .select('email name preferences')
            .lean()
            .exec();

          const emailEnabled =
            user !== null &&
            (user.preferences as Record<string, unknown> | undefined)?.['emailNotifications'] !== false;

          if (emailEnabled && user !== null) {
            await sendBudgetAlert(user.email, {
              userName: user.name,
              budgetName: alert.budgetName,
              categoryName: alert.categoryName,
              percentageUsed: alert.percentageUsed,
              amountSpent: 'N/A', // Detailed amounts require extra query; keep simple here
              amountBudgeted: 'N/A',
            });
          }
        } catch (emailErr) {
          logger.warn({ emailErr, userId }, 'Failed to send budget alert email');
        }

        alertsSent++;
      }
    } catch (err) {
      errors++;
      logger.error({ err, userId }, 'Error processing budget alerts for user');
    }
  }

  logger.info({ alertsSent, errors, users: userIds.length }, 'Budget alerts job completed');
}

// ============================================================================
// Job 2 — Recurring payment reminders (08:00 UTC)
// ============================================================================

async function runRecurringReminderJob(): Promise<void> {
  logger.info('Starting recurring payment reminders job');
  const redis = getRedisClient();
  const today = todayKey();

  // Find recurring transactions with nextDate in the next 7 days
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const sevenDaysOut = new Date(tomorrow);
  sevenDaysOut.setUTCDate(sevenDaysOut.getUTCDate() + 7);

  const upcomingRecurring = await TransactionModel.find({
    'recurring.nextDate': { $gte: tomorrow, $lte: sevenDaysOut },
  })
    .select('_id userId description amount currency recurring')
    .lean()
    .exec();

  let notificationsSent = 0;
  let errors = 0;

  for (const tx of upcomingRecurring) {
    const userId = String(tx.userId);
    const txId = String(tx._id);

    try {
      const dedupeKey = `recurring_notif:${userId}:${txId}:${today}`;
      const alreadySent = await redis.get(dedupeKey);
      if (alreadySent !== null) continue;

      const nextDate = tx.recurring?.nextDate;
      const daysUntil = nextDate
        ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      await createNotification(userId, {
        type: 'recurring_due',
        title: `Pago recurrente próximo: ${tx.description}`,
        message: `Tu pago recurrente "${tx.description}" de ${eurosCents(tx.amount)} vence ${daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`}.`,
        data: {
          transactionId: txId,
          description: tx.description,
          amount: tx.amount,
          currency: tx.currency,
          nextDate: nextDate?.toISOString(),
          daysUntil,
        },
      });

      // TTL 7 days to prevent reminders every day for the same upcoming payment
      await redis.set(dedupeKey, '1', 'EX', 7 * 24 * 60 * 60);
      notificationsSent++;
    } catch (err) {
      errors++;
      logger.error({ err, userId, txId }, 'Error creating recurring reminder notification');
    }
  }

  logger.info({ notificationsSent, errors }, 'Recurring reminders job completed');
}

// ============================================================================
// Job 3 — Monthly report generation (1st of month, 07:00 UTC)
// ============================================================================

async function runMonthlyReportJob(): Promise<void> {
  logger.info('Starting monthly report generation job');

  const now = new Date();
  // Report covers the previous month
  const reportDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const reportYear = reportDate.getFullYear();
  const reportMonth = reportDate.getMonth() + 1;
  const monthName = `${MONTH_NAMES_ES[reportMonth - 1]} ${reportYear}`;

  const users = await UserModel.find({}).select('_id email name').lean().exec();

  let success = 0;
  let errors = 0;

  for (const user of users) {
    const userId = String(user._id);
    try {
      // Generate the PDF (we store it in memory; in production you'd upload to S3/CDN)
      await generateMonthlyReport(userId, reportYear, reportMonth);

      await createNotification(userId, {
        type: 'report_ready',
        title: `Informe mensual listo: ${monthName}`,
        message: `Tu informe financiero de ${monthName} está disponible para descargar.`,
        data: { year: reportYear, month: reportMonth },
      });

      // Build download URL pointing to the reports endpoint
      const APP_BASE_URL = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';
      const reportUrl = `${APP_BASE_URL}/api/reports/monthly?year=${reportYear}&month=${reportMonth}`;

      try {
        await sendMonthlyReportEmail(user.email, {
          userName: user.name,
          month: monthName,
          reportUrl,
          summary: { income: 'Ver informe', expenses: 'Ver informe', savingsRate: 'Ver informe' },
        });
      } catch (emailErr) {
        logger.warn({ emailErr, userId }, 'Failed to send monthly report email');
      }

      success++;
    } catch (err) {
      errors++;
      logger.error({ err, userId }, 'Error generating monthly report for user');
    }
  }

  logger.info({ success, errors, users: users.length }, 'Monthly report job completed');
}

// ============================================================================
// Job 4 — Goal reached notifications (09:05 UTC)
// ============================================================================

async function runGoalReachedJob(): Promise<void> {
  logger.info('Starting goal reached notifications job');

  // Find completed goals that don't have a goal_reached notification in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const completedGoals = await GoalModel.find({
    isCompleted: true,
    isActive: true,
  })
    .select('_id userId name targetAmount')
    .lean()
    .exec();

  let notificationsSent = 0;
  let errors = 0;

  for (const goal of completedGoals) {
    const userId = String(goal.userId);
    const goalId = String(goal._id);

    try {
      // Check if a goal_reached notification already exists in the last 30 days
      const existingNotification = await NotificationModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'goal_reached',
        'data.goalId': goalId,
        createdAt: { $gte: thirtyDaysAgo },
      })
        .select('_id')
        .lean()
        .exec();

      if (existingNotification !== null) continue;

      await createNotification(userId, {
        type: 'goal_reached',
        title: `¡Meta alcanzada: ${goal.name}!`,
        message: `Felicidades, has alcanzado tu meta financiera "${goal.name}" de ${eurosCents(goal.targetAmount)}.`,
        data: {
          goalId,
          goalName: goal.name,
          targetAmount: goal.targetAmount,
        },
      });

      try {
        const user = await UserModel.findById(userId)
          .select('email name')
          .lean()
          .exec();

        if (user !== null) {
          await sendGoalReachedEmail(user.email, {
            userName: user.name,
            goalName: goal.name,
            targetAmount: eurosCents(goal.targetAmount),
          });
        }
      } catch (emailErr) {
        logger.warn({ emailErr, userId, goalId }, 'Failed to send goal reached email');
      }

      notificationsSent++;
    } catch (err) {
      errors++;
      logger.error({ err, userId, goalId }, 'Error creating goal reached notification');
    }
  }

  logger.info({ notificationsSent, errors }, 'Goal reached notifications job completed');
}

// ============================================================================
// Scheduler registration
// ============================================================================

export function scheduleNotificationJobs(): void {
  // Job 1: Budget alerts — daily at 09:00 UTC
  cron.schedule(
    '0 9 * * *',
    () => {
      void runBudgetAlertsJob();
    },
    { timezone: 'UTC' },
  );

  // Job 2: Recurring payment reminders — daily at 08:00 UTC
  cron.schedule(
    '0 8 * * *',
    () => {
      void runRecurringReminderJob();
    },
    { timezone: 'UTC' },
  );

  // Job 3: Monthly report generation — 1st of each month at 07:00 UTC
  cron.schedule(
    '0 7 1 * *',
    () => {
      void runMonthlyReportJob();
    },
    { timezone: 'UTC' },
  );

  // Job 4: Goal reached notifications — daily at 09:05 UTC
  cron.schedule(
    '5 9 * * *',
    () => {
      void runGoalReachedJob();
    },
    { timezone: 'UTC' },
  );

  logger.info(
    'Notification jobs scheduled: budget-alerts(09:00), recurring-reminders(08:00), monthly-report(07:00 day-1), goal-reached(09:05)',
  );
}
