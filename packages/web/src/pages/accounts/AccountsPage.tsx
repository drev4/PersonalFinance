import { Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { AccountCard } from '../../components/accounts/AccountCard';
import { AccountFormDialog } from '../../components/accounts/AccountFormDialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { TopBar } from '../../components/ui/TopBar';
import { useAccounts, useNetWorth } from '../../hooks/useAccounts';
import { formatCurrency } from '../../lib/formatters';

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

export default function AccountsPage(): React.ReactElement {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: netWorth, isLoading: netWorthLoading } = useNetWorth();

  const activeAccounts = accounts?.filter((a) => a.isActive) ?? [];

  // Use netWorth data which already has proper currency conversion from backend
  // Falls back to calculating locally if netWorth is unavailable
  const assetsTotal = netWorth?.assets ?? 0;
  const liabilitiesTotal = netWorth?.liabilities ?? 0;
  const netWorthTotal = netWorth?.total ?? 0;
  const baseCurrency = netWorth?.currency ?? 'EUR';

  // Breakdown by account category (cash, investments, realEstate, vehicles, debts)
  const breakdown = netWorth?.breakdown ?? {
    cash: 0,
    investments: 0,
    realEstate: 0,
    vehicles: 0,
    debts: 0,
  };

  return (
    <div className="animate-fade-in">
      <TopBar
        title="Mis cuentas"
        subtitle="Gestiona todas tus cuentas financieras"
        action={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva cuenta
          </Button>
        }
      />
      <div className="p-6">
        <div className="mx-auto max-w-6xl">
          {/* Net worth summary */}
          {netWorthLoading ? (
            <NetWorthSkeleton />
          ) : (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500 mb-1">Patrimonio neto</p>
                <p className="text-3xl font-bold text-gray-900 mb-4">
                  {formatCurrency(netWorthTotal, baseCurrency)}
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Assets */}
                  <div className="rounded-lg bg-green-50 p-4">
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
                      Activos
                    </p>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(assetsTotal, baseCurrency)}
                    </p>
                  </div>

                  {/* Liabilities */}
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">
                      Pasivos
                    </p>
                    <p className="text-xl font-bold text-red-700">
                      {formatCurrency(liabilitiesTotal, baseCurrency)}
                    </p>
                  </div>
                </div>

                {/* Breakdown by category */}
                {netWorth && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(breakdown)
                      .filter(([, total]) => total !== 0)
                      .map(([category, total]) => (
                        <div key={category} className="rounded-md bg-gray-50 px-3 py-2">
                          <p className="text-xs text-gray-500 capitalize">{category}</p>
                          <p className="text-sm font-semibold text-gray-700">
                            {formatCurrency(total, baseCurrency)}
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
      </div>

      <AccountFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
