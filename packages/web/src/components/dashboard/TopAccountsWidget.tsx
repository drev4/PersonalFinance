import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency, getAccountTypeLabel } from '../../lib/formatters';
import { useAccounts } from '../../hooks/useAccounts';
import type { Account } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_ACCOUNTS = 5;

export default function TopAccountsWidget(): React.ReactElement {
  const { data, isLoading } = useAccounts();

  // Sort active accounts by currentBalance descending, take top 5
  const topAccounts: Account[] = data
    ? [...data]
        .filter((a) => a.isActive)
        .sort((a, b) => b.currentBalance - a.currentBalance)
        .slice(0, MAX_ACCOUNTS)
    : [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-600">
            Top cuentas
          </CardTitle>
          <Wallet className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Loading */}
        {isLoading && (
          <div className="divide-y divide-gray-100">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Empty */}
        {!isLoading && topAccounts.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-400">No hay cuentas activas.</p>
          </div>
        )}

        {/* List */}
        {!isLoading && topAccounts.length > 0 && (
          <>
            <ul className="divide-y divide-gray-100" aria-label="Top cuentas por saldo">
              {topAccounts.map((account) => {
                const isNegative = account.currentBalance < 0;
                return (
                  <li key={account._id} className="flex items-center gap-3 py-2.5">
                    {/* Color dot / icon */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: account.color
                          ? `${account.color}22`
                          : '#f1f5f9',
                      }}
                      aria-hidden="true"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: account.color ?? '#94a3b8' }}
                      />
                    </div>

                    {/* Name + type */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {account.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getAccountTypeLabel(account.type)}
                      </p>
                    </div>

                    {/* Balance */}
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold',
                        isNegative ? 'text-red-600' : 'text-gray-900',
                      )}
                    >
                      {formatCurrency(account.currentBalance, account.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Footer link */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <Link
                to="/accounts"
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Ver todas las cuentas
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
