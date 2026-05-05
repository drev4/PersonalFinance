import { BarChart2, PiggyBank, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { BudgetCard } from '../../components/budgets/BudgetCard';
import { BudgetComparisonChart } from '../../components/budgets/BudgetComparisonChart';
import { BudgetFormDialog } from '../../components/budgets/BudgetFormDialog';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { useBudgets, useBudgetAlerts, useBudgetProgress } from '../../hooks/useBudgets';
import { formatCurrency } from '../../lib/formatters';
import type { Budget } from '../../types/api';

// ─── Comparison section ────────────────────────────────────────────────────────

interface ComparisonSectionProps {
  budgets: Budget[];
}

function ComparisonSection({ budgets }: ComparisonSectionProps): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(budgets[0]?._id ?? '');
  const { data: progress, isLoading } = useBudgetProgress(selectedId);

  if (budgets.length === 0) return <></>;

  const selected = budgets.find((b) => b._id === selectedId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary-600" aria-hidden="true" />
            <CardTitle className="text-base font-semibold text-gray-700">
              Comparativa presupuesto vs real
            </CardTitle>
          </div>

          {budgets.length > 1 && (
            <Select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-48 text-sm"
            >
              {budgets.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Summary totals */}
        {progress && !isLoading && (
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-500" />
              <span className="text-gray-500">Presupuestado:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(progress.totalBudgeted, 'EUR')}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    progress.percentageUsed >= 100
                      ? '#FF4757'
                      : progress.percentageUsed >= 80
                      ? '#F59E0B'
                      : '#00C896',
                }}
              />
              <span className="text-gray-500">Gastado:</span>
              <span
                className="font-semibold"
                style={{
                  color:
                    progress.percentageUsed >= 100
                      ? '#FF4757'
                      : progress.percentageUsed >= 80
                      ? '#F59E0B'
                      : '#00C896',
                }}
              >
                {formatCurrency(progress.totalSpent, 'EUR')}
              </span>
            </span>
            <span className="text-gray-400 text-xs self-center">
              {selected?.period === 'monthly' ? 'Mensual' : 'Anual'} ·{' '}
              {progress.percentageUsed.toFixed(1)}% usado
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
          </div>
        ) : progress && progress.items.length > 0 ? (
          <BudgetComparisonChart items={progress.items} />
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">
            Sin datos de gasto para este periodo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BudgetsSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function BudgetsPage(): React.ReactElement {
  const [formOpen, setFormOpen] = useState(false);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { data: alerts } = useBudgetAlerts();

  const exceededAlerts = alerts?.filter((a) => a.status === 'exceeded') ?? [];
  const warningAlerts = alerts?.filter((a) => a.status === 'warning') ?? [];
  const hasAlerts = exceededAlerts.length > 0 || warningAlerts.length > 0;

  const activeBudgets = budgets?.filter((b) => b.isActive) ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="mt-1 text-sm text-gray-500">Controla tus gastos por categoria y periodo.</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <span aria-hidden="true">+</span>
          Nuevo presupuesto
        </Button>
      </div>

      {/* Alerts banner */}
      {hasAlerts && (
        <Alert variant="destructive" className="flex gap-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <AlertTitle>
              {exceededAlerts.length > 0
                ? `${exceededAlerts.length} ${
                    exceededAlerts.length === 1 ? 'categoria excedida' : 'categorias excedidas'
                  }`
                : `${warningAlerts.length} ${
                    warningAlerts.length === 1
                      ? 'categoria proxima al limite'
                      : 'categorias proximas al limite'
                  }`}
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-0.5">
                {exceededAlerts.map((a) => (
                  <li key={`${a.budgetId}-${a.categoryName}`} className="text-sm">
                    <span className="font-medium">{a.budgetName}</span> — {a.categoryName}:{' '}
                    {a.percentageUsed.toFixed(0)}% usado
                  </li>
                ))}
                {warningAlerts.map((a) => (
                  <li key={`${a.budgetId}-${a.categoryName}`} className="text-sm">
                    <span className="font-medium">{a.budgetName}</span> — {a.categoryName}:{' '}
                    {a.percentageUsed.toFixed(0)}% usado
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Content */}
      {budgetsLoading ? (
        <BudgetsSkeleton />
      ) : budgets && budgets.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetCard key={budget._id} budget={budget} />
            ))}
          </div>

          {activeBudgets.length > 0 && <ComparisonSection budgets={activeBudgets} />}
        </>
      ) : (
        <EmptyState
          icon={<PiggyBank className="h-8 w-8" aria-hidden="true" />}
          title="Sin presupuestos"
          description="Crea tu primer presupuesto para controlar tus gastos por categoria."
          action={{
            label: '+ Nuevo presupuesto',
            onClick: () => setFormOpen(true),
          }}
        />
      )}

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
