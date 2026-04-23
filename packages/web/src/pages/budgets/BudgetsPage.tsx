import { useState } from 'react';
import type React from 'react';
import { PiggyBank, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';
import { BudgetCard } from '../../components/budgets/BudgetCard';
import { BudgetFormDialog } from '../../components/budgets/BudgetFormDialog';
import { useBudgets, useBudgetAlerts } from '../../hooks/useBudgets';

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Controla tus gastos por categoria y periodo.
          </p>
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
                ? `${exceededAlerts.length} ${exceededAlerts.length === 1 ? 'categoria excedida' : 'categorias excedidas'}`
                : `${warningAlerts.length} ${warningAlerts.length === 1 ? 'categoria proxima al limite' : 'categorias proximas al limite'}`}
            </AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-0.5">
                {exceededAlerts.map((a) => (
                  <li key={`${a.budgetId}-${a.categoryName}`} className="text-sm">
                    <span className="font-medium">{a.budgetName}</span> —{' '}
                    {a.categoryName}: {a.percentageUsed.toFixed(0)}% usado
                  </li>
                ))}
                {warningAlerts.map((a) => (
                  <li key={`${a.budgetId}-${a.categoryName}`} className="text-sm">
                    <span className="font-medium">{a.budgetName}</span> —{' '}
                    {a.categoryName}: {a.percentageUsed.toFixed(0)}% usado
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget._id} budget={budget} />
          ))}
        </div>
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
