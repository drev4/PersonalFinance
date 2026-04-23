import cron from 'node-cron';
import pino from 'pino';
import { TransactionModel, type RecurringFrequency } from '../modules/transactions/transaction.model.js';

const logger = pino({ name: 'job.recurringTransactions' });

// ---------------------------------------------------------------------------
// Helper — advance a date by the given frequency + interval
// ---------------------------------------------------------------------------

function advanceDate(
  base: Date,
  frequency: RecurringFrequency,
  interval: number,
): Date {
  const next = new Date(base);
  switch (frequency) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + interval * 7);
      break;
    case 'monthly':
      next.setUTCMonth(next.getUTCMonth() + interval);
      break;
    case 'yearly':
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      break;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Core processor
// ---------------------------------------------------------------------------

async function processRecurringTransactions(): Promise<{
  created: number;
  skipped: number;
  errors: number;
}> {
  const now = new Date();
  // Normalize to midnight UTC so we catch anything due today
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  // Find all recurring templates whose nextDate is on or before today
  const templates = await TransactionModel.find({
    'recurring.nextDate': { $lte: today },
  }).exec();

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const template of templates) {
    try {
      if (template.recurring === undefined) {
        skipped++;
        continue;
      }

      const { frequency, interval, nextDate, endDate } = template.recurring;

      // If endDate has already passed, remove recurring and skip generation
      if (endDate !== undefined && endDate < today) {
        await TransactionModel.findByIdAndUpdate(template._id, {
          $unset: { recurring: '' },
        }).exec();
        skipped++;
        continue;
      }

      // Create the new transaction instance (without `recurring` field)
      await TransactionModel.create({
        userId: template.userId,
        accountId: template.accountId,
        type: template.type,
        amount: template.amount,
        currency: template.currency,
        date: nextDate,
        description: template.description,
        categoryId: template.categoryId,
        tags: template.tags,
        transferToAccountId: template.transferToAccountId,
        attachments: template.attachments ?? [],
        source: template.source,
        // parentId links the generated instance back to the template
        // (stored inside the recurring sub-document of the generated tx)
        recurring: undefined,
      });
      created++;

      // Advance the template's nextDate
      const newNextDate = advanceDate(nextDate, frequency, interval);

      // If the new next date would exceed endDate, clear recurring instead
      if (endDate !== undefined && newNextDate > endDate) {
        await TransactionModel.findByIdAndUpdate(template._id, {
          $unset: { recurring: '' },
        }).exec();
      } else {
        await TransactionModel.findByIdAndUpdate(template._id, {
          $set: { 'recurring.nextDate': newNextDate },
        }).exec();
      }
    } catch (err) {
      errors++;
      logger.error(
        { err, templateId: template._id.toHexString() },
        'Failed to process recurring transaction',
      );
    }
  }

  return { created, skipped, errors };
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Schedules the daily recurring-transactions processing job.
 * Runs every day at 00:10 UTC.
 */
export function scheduleRecurringTransactionsJob(): void {
  cron.schedule(
    '10 0 * * *',
    async () => {
      logger.info('Starting recurring transactions job');
      try {
        const result = await processRecurringTransactions();
        logger.info(
          { created: result.created, skipped: result.skipped, errors: result.errors },
          'Recurring transactions job completed',
        );
      } catch (err) {
        logger.error({ err }, 'Fatal error in recurring transactions job');
      }
    },
    { timezone: 'UTC' },
  );

  logger.info('Recurring transactions job scheduled (10 0 * * * UTC)');
}
