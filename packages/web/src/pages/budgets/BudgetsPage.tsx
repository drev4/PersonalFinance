import { BarChart2, PiggyBank, AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { BudgetCard } from '../../components/budgets/BudgetCard';
import { BudgetComparisonChart } from '../../components/budgets/BudgetComparisonChart';
import { BudgetFormDialog } from '../../components/budgets/BudgetFormDialog';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';
import { EmptyState } from '../../components/ui/empty-state';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { TopBar } from '../../components/ui/TopBar';
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
    <div
      style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 24,
      }}
    >
      <div style={{ padding: '20px 20px 12px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Comparativa presupuesto vs real
            </span>
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

        {progress && !isLoading && (
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, marginBottom: 4 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--text-3)' }}>Presupuestado:</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                {formatCurrency(progress.totalBudgeted, 'EUR')}
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background:
                    progress.percentageUsed >= 100
                      ? 'var(--negative)'
                      : progress.percentageUsed >= 80
                        ? 'var(--warn)'
                        : 'var(--accent)',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--text-3)' }}>Gastado:</span>
              <span
                style={{
                  fontWeight: 600,
                  color:
                    progress.percentageUsed >= 100
                      ? 'var(--negative)'
                      : progress.percentageUsed >= 80
                        ? 'var(--warn)'
                        : 'var(--accent)',
                }}
              >
                {formatCurrency(progress.totalSpent, 'EUR')}
              </span>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-4)', alignSelf: 'center' }}>
              {selected?.period === 'monthly' ? 'Mensual' : 'Anual'} ·{' '}
              {progress.percentageUsed.toFixed(1)}% usado
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
          </div>
        ) : progress && progress.items.length > 0 ? (
          <BudgetComparisonChart items={progress.items} />
        ) : (
          <p
            style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-4)' }}
          >
            Sin datos de gasto para este periodo.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BudgetsSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline)',
            borderRadius: 16,
            padding: 20,
          }}
          className="space-y-3"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetsPage(): React.ReactElement {
  const [formOpen, setFormOpen] = useState(false);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { data: alerts } = useBudgetAlerts();

  const exceededAlerts = alerts?.filter((a) => a.status === 'exceeded') ?? [];
  const warningAlerts = alerts?.filter((a) => a.status === 'warning') ?? [];
  const hasAlerts = exceededAlerts.length > 0 || warningAlerts.length > 0;

  const activeBudgets = budgets?.filter((b) => b.isActive) ?? [];

  return (
    <div className="animate-fade-in">
      <TopBar
        title="Categorías"
        subtitle="Mayo de 2026"
        action={
          <button
            onClick={() => setFormOpen(true)}
            style={{
              background: 'var(--accent)',
              color: '#0A0A0A',
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Nuevo presupuesto
          </button>
        }
      />

      <div style={{ padding: '28px 40px 60px' }}>
        {/* Alerts banner */}
        {hasAlerts && (
          <div style={{ marginBottom: 20 }}>
            <Alert variant="destructive" className="flex gap-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <AlertTitle>
                  {exceededAlerts.length > 0
                    ? `${exceededAlerts.length} ${exceededAlerts.length === 1 ? 'categoría excedida' : 'categorías excedidas'}`
                    : `${warningAlerts.length} ${warningAlerts.length === 1 ? 'categoría próxima al límite' : 'categorías próximas al límite'}`}
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
          </div>
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
            description="Crea tu primer presupuesto para controlar tus gastos por categoría."
            action={{ label: '+ Nuevo presupuesto', onClick: () => setFormOpen(true) }}
          />
        )}
      </div>

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
