import { useState } from 'react';
import type React from 'react';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { AccountCard } from '../../components/accounts/AccountCard';
import { AccountFormDialog } from '../../components/accounts/AccountFormDialog';
import { useAccounts, useNetWorth } from '../../hooks/useAccounts';
import { formatCurrency, getAccountTypeLabel } from '../../lib/formatters';
import type { AccountType } from '../../types/api';

function AccountsSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mb-1 h-3 w-16" />
          <Skeleton className="mb-3 h-7 w-32" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function NetWorthSkeleton(): React.ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-10 w-48 mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

const ASSET_TYPES: AccountType[] = ['checking', 'savings', 'cash', 'investment', 'crypto', 'real_estate', 'vehicle', 'other'];
const LIABILITY_TYPES: AccountType[] = ['credit_card', 'loan', 'mortgage'];

export default function AccountsPage(): React.ReactElement {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: netWorth, isLoading: netWorthLoading } = useNetWorth();

  const activeAccounts = accounts?.filter((a) => a.isActive) ?? [];

  // Compute assets and liabilities from accounts if netWorth is unavailable
  const assetsTotal = activeAccounts
    .filter((a) => ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const liabilitiesTotal = activeAccounts
    .filter((a) => LIABILITY_TYPES.includes(a.type))
    .reduce((sum, a) => sum + a.currentBalance, 0);

  // Group accounts by type for the breakdown
  const byType = netWorth?.byType ?? {};

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis cuentas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona todas tus cuentas financieras
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva cuenta
          </Button>
        </div>

        {/* Net worth summary */}
        {netWorthLoading ? (
          <NetWorthSkeleton />
        ) : (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500 mb-1">Patrimonio neto</p>
              <p className="text-3xl font-bold text-gray-900 mb-4">
                {formatCurrency(
                  netWorth?.totalBalance ?? assetsTotal - liabilitiesTotal,
                  'EUR',
                )}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Assets */}
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                    Activos
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(assetsTotal, 'EUR')}
                  </p>
                </div>

                {/* Liabilities */}
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">
                    Pasivos
                  </p>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(liabilitiesTotal, 'EUR')}
                  </p>
                </div>
              </div>

              {/* Breakdown by type */}
              {Object.keys(byType).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(byType).map(([type, total]) => (
                    <div key={type} className="rounded-md bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">{getAccountTypeLabel(type as AccountType)}</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {formatCurrency(total, 'EUR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Accounts grid */}
        {accountsLoading ? (
          <AccountsSkeleton />
        ) : activeAccounts.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-8 w-8" aria-hidden="true" />}
            title="No tienes cuentas todavia"
            description="Crea tu primera cuenta para empezar a registrar tus finanzas personales."
            action={{ label: 'Crear primera cuenta', onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeAccounts.map((account) => (
              <AccountCard key={account._id} account={account} />
            ))}
          </div>
        )}
      </div>

      <AccountFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
