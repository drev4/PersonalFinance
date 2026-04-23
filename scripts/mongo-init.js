// MongoDB initialization script
// Runs inside the `finanzas` database (set by MONGO_INITDB_DATABASE)
// Executed once on first container startup via docker-entrypoint-initdb.d

// ---------------------------------------------------------------------------
// 1. Application user
// ---------------------------------------------------------------------------
db.createUser({
  user: 'finanzas_user',
  pwd: 'finanzas_pass',
  roles: [
    { role: 'readWrite', db: 'finanzas' },
  ],
});

// ---------------------------------------------------------------------------
// 2. Indexes — users
// ---------------------------------------------------------------------------
db.users.createIndex(
  { email: 1 },
  { unique: true, name: 'users_email_unique' }
);

// ---------------------------------------------------------------------------
// 3. Indexes — transactions
// ---------------------------------------------------------------------------
db.transactions.createIndex(
  { userId: 1, date: -1 },
  { name: 'transactions_userId_date' }
);

db.transactions.createIndex(
  { userId: 1, categoryId: 1, date: -1 },
  { name: 'transactions_userId_categoryId_date' }
);

// ---------------------------------------------------------------------------
// 4. Indexes — holdings
// ---------------------------------------------------------------------------
db.holdings.createIndex(
  { userId: 1, symbol: 1 },
  { name: 'holdings_userId_symbol' }
);

// ---------------------------------------------------------------------------
// 5. Indexes — categoryRules
// ---------------------------------------------------------------------------
db.categoryRules.createIndex(
  { userId: 1, priority: -1 },
  { name: 'categoryRules_userId_priority' }
);

// ---------------------------------------------------------------------------
// 6. Indexes — priceSnapshots
// ---------------------------------------------------------------------------
db.priceSnapshots.createIndex(
  { symbol: 1, timestamp: -1 },
  { name: 'priceSnapshots_symbol_timestamp' }
);

// ---------------------------------------------------------------------------
// 7. Indexes — netWorthSnapshots
// ---------------------------------------------------------------------------
db.netWorthSnapshots.createIndex(
  { userId: 1, date: -1 },
  { name: 'netWorthSnapshots_userId_date' }
);

// ---------------------------------------------------------------------------
// 8. Indexes — auditLog (compound + TTL of 365 days)
// ---------------------------------------------------------------------------
db.auditLog.createIndex(
  { userId: 1, createdAt: -1 },
  { name: 'auditLog_userId_createdAt' }
);

db.auditLog.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 31536000, name: 'auditLog_createdAt_ttl' } // 365 days
);

print('mongo-init.js: database "finanzas" initialized successfully.');
