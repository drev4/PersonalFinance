import mongoose from 'mongoose';
import env from './env.js';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.info('[DB] MongoDB connected successfully');
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error);
    throw error;
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.info('[DB] MongoDB reconnected');
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error('[DB] MongoDB error:', err);
  });

  // Build any missing indexes in the background. Mongoose normally does this
  // on the first model use, but running it explicitly (and in parallel) surfaces
  // index errors at boot time instead of at request time.
  await ensureIndexes();
}

/**
 * Imports every Mongoose model in the application and calls `createIndexes()`
 * on each one in parallel. Failures are logged but do not prevent startup —
 * the app can still run against an existing index set; only new indexes would
 * be missing until the underlying issue is resolved.
 */
export async function ensureIndexes(): Promise<void> {
  try {
    // Dynamic imports so this module doesn't create a circular dependency with
    // the model files (which themselves register schemas on mongoose).
    const [
      { UserModel },
      { AccountModel },
      { CategoryModel },
      { TransactionModel },
      { BudgetModel },
      { GoalModel },
      { HoldingModel },
      { NotificationModel },
      { NetWorthSnapshotModel },
      { AuditLogModel },
    ] = await Promise.all([
      import('../modules/users/user.model.js'),
      import('../modules/accounts/account.model.js'),
      import('../modules/categories/category.model.js'),
      import('../modules/transactions/transaction.model.js'),
      import('../modules/budgets/budget.model.js'),
      import('../modules/goals/goal.model.js'),
      import('../modules/holdings/holding.model.js'),
      import('../modules/notifications/notification.model.js'),
      import('../modules/dashboard/netWorthSnapshot.model.js'),
      import('../modules/audit/auditLog.model.js'),
    ]);

    // Each model has a different generic type parameter, but they all share the
    // same `createIndexes()` signature. Treat them uniformly here.
    const models: Array<{ createIndexes(): Promise<void> }> = [
      UserModel,
      AccountModel,
      CategoryModel,
      TransactionModel,
      BudgetModel,
      GoalModel,
      HoldingModel,
      NotificationModel,
      NetWorthSnapshotModel,
      AuditLogModel,
    ];

    const results = await Promise.allSettled(
      models.map((model) => model.createIndexes()),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      for (const failure of failures) {
        if (failure.status === 'rejected') {
          console.error('[DB] Index creation failed:', failure.reason);
        }
      }
    } else {
      console.info(`[DB] Ensured indexes on ${models.length} models`);
    }
  } catch (err) {
    console.error('[DB] Failed to ensure indexes:', err);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.info('[DB] MongoDB disconnected gracefully');
}
