import { TrendingDown, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { DebtCard } from '../../components/debts/DebtCard';
import { DebtFormDialog } from '../../components/debts/DebtFormDialog';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { useDebts } from '../../hooks/useDebts';
import { formatCurrency } from '../../lib/formatters';
import type { Debt } from '../../types/api';

type Strategy = 'none' | 'avalanche' | 'snowball';

const STRATEGY_LABELS: Record<Strategy, string> = {
  none: 'Sin ordenar',
  avalanche: 'Avalanche (mayor interés primero)',
  snowball: 'Snowball (menor saldo primero)',
};

function sortDebts(debts: Debt[], strategy: Strategy): Debt[] {
  if (strategy === 'avalanche') {
    return [...debts].sort((a, b) => b.interestRate - a.interestRate);
  }
  if (strategy === 'snowball') {
    return [...debts].sort((a, b) => a.currentBalance - b.currentBalance);
  }
  return debts;
}

function DebtsSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function SummaryBar({ debts }: { debts: Debt[] }): React.ReactElement {
  const totalBalance = debts.reduce((s, d) => s + d.currentBalance, 0);
  const totalOriginal = debts.reduce((s, d) => s + d.originalAmount, 0);
  const totalPaid = totalOriginal - totalBalance;
  const pct = totalOriginal > 0 ? Math.min(100, (totalPaid / totalOriginal) * 100) : 0;

  const weightedRate =
    debts.length > 0
      ? debts.reduce((s, d) => s + d.interestRate * d.currentBalance, 0) /
        debts.reduce((s, d) => s + d.currentBalance, 0)
      : 0;

  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Deuda total</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalBalance, 'EUR')}</p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-xs text-red-400">Ya pagado</p>
            <p className="text-sm font-semibold text-red-700">{formatCurrency(totalPaid, 'EUR')}</p>
          </div>
          <div>
            <p className="text-xs text-red-400">Tasa media</p>
            <p className="text-sm font-semibold text-red-700">{weightedRate.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-red-400">Deudas activas</p>
            <p className="text-sm font-semibold text-red-700">{debts.length}</p>
          </div>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-red-400">
          <span>Progreso total</span>
          <span>{pct.toFixed(1)}% pagado</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-red-200">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DebtsPage(): React.ReactElement {
  const [formOpen, setFormOpen] = useState(false);
  const [paidExpanded, setPaidExpanded] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>('none');
  const [strategyMenuOpen, setStrategyMenuOpen] = useState(false);

  const { data: debts, isLoading } = useDebts();

  const activeDebts = debts?.filter((d) => !d.isPaidOff && d.isActive) ?? [];
  const paidDebts = debts?.filter((d) => d.isPaidOff) ?? [];
  const hasAny = (debts?.length ?? 0) > 0;

  const sortedActive = sortDebts(activeDebts, strategy);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de deudas</h1>
          <p className="mt-1 text-sm text-gray-500">Controla y acelera el pago de tus deudas.</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <span aria-hidden="true">+</span>
          Nueva deuda
        </Button>
      </div>

      {isLoading ? (
        <DebtsSkeleton />
      ) : !hasAny ? (
        <EmptyState
          icon={<TrendingDown className="h-8 w-8" aria-hidden="true" />}
          title="Sin deudas registradas"
          description="Añade tus deudas para hacer un seguimiento y planificar su liquidación."
          action={{
            label: '+ Nueva deuda',
            onClick: () => setFormOpen(true),
          }}
        />
      ) : (
        <>
          {/* Summary */}
          {activeDebts.length > 0 && <SummaryBar debts={activeDebts} />}

          {/* Active debts */}
          {activeDebts.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  Deudas activas
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({activeDebts.length})
                  </span>
                </h2>

                {/* Strategy picker */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => setStrategyMenuOpen((v) => !v)}
                    aria-expanded={strategyMenuOpen}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                    {STRATEGY_LABELS[strategy]}
                  </Button>
                  {strategyMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setStrategyMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        {(Object.entries(STRATEGY_LABELS) as [Strategy, string][]).map(
                          ([key, label]) => (
                            <button
                              key={key}
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                setStrategy(key);
                                setStrategyMenuOpen(false);
                              }}
                            >
                              <span className="font-medium">{label.split(' (')[0]}</span>
                              {label.includes('(') && (
                                <span className="block text-xs text-gray-400">
                                  {label.match(/\((.+)\)/)?.[1]}
                                </span>
                              )}
                            </button>
                          ),
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {strategy !== 'none' && (
                <p className="mb-4 text-xs text-gray-500">
                  {strategy === 'avalanche'
                    ? 'Estrategia Avalanche: paga primero la deuda con mayor tasa de interés para ahorrar más en total.'
                    : 'Estrategia Snowball: paga primero la deuda más pequeña para ganar motivación con victorias rápidas.'}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedActive.map((debt) => (
                  <DebtCard key={debt._id} debt={debt} />
                ))}
              </div>
            </section>
          )}

          {activeDebts.length === 0 && (
            <EmptyState
              icon={<TrendingDown className="h-7 w-7" aria-hidden="true" />}
              title="¡Sin deudas activas!"
              description="Has liquidado todas tus deudas. Crea una nueva si tienes alguna pendiente."
              action={{ label: '+ Nueva deuda', onClick: () => setFormOpen(true) }}
            />
          )}

          {/* Paid off — colapsable */}
          {paidDebts.length > 0 && (
            <section>
              <button
                className="flex w-full items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100"
                onClick={() => setPaidExpanded((v) => !v)}
                aria-expanded={paidExpanded}
              >
                <span className="text-sm font-semibold text-green-800">
                  Deudas liquidadas ({paidDebts.length})
                </span>
                {paidExpanded ? (
                  <ChevronUp className="h-4 w-4 text-green-600" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-green-600" aria-hidden="true" />
                )}
              </button>

              {paidExpanded && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paidDebts.map((debt) => (
                    <DebtCard key={debt._id} debt={debt} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <DebtFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
