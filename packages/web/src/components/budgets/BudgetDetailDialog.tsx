import { useState } from 'react';
import type React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { BudgetFormDialog } from './BudgetFormDialog';
import { useBudgetProgress } from '../../hooks/useBudgets';
import type { Budget, BudgetItemProgress } from '../../types/api';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface BudgetDetailDialogProps {
  budget: Budget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusColor(status: BudgetItemProgress['status']): string {
  switch (status) {
    case 'exceeded':
      return 'bg-red-500';
    case 'warning':
      return 'bg-yellow-400';
    default:
      return 'bg-green-500';
  }
}

function percentageColor(pct: number): string {
  if (pct >= 100) return 'text-red-600';
  if (pct >= 80) return 'text-yellow-600';
  return 'text-green-600';
}

export function BudgetDetailDialog({
  budget,
  open,
  onOpenChange,
}: BudgetDetailDialogProps): React.ReactElement {
  const [editOpen, setEditOpen] = useState(false);
  const { data: progress, isLoading } = useBudgetProgress(budget._id);

  const radialData = progress
    ? [{ value: Math.min(100, progress.percentageUsed) }]
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between pr-6">
              <div>
                <DialogTitle>{budget.name}</DialogTitle>
                <Badge variant="outline" className="mt-1">
                  {budget.period === 'monthly' ? 'Mensual' : 'Anual'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                Editar
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : progress ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Periodo</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatDate(progress.periodStart)} — {formatDate(progress.periodEnd)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Gastado / Presupuestado</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(progress.totalSpent, 'EUR')}
                    <span className="font-normal text-gray-500">
                      {' / '}
                      {formatCurrency(progress.totalBudgeted, 'EUR')}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Uso total</p>
                  <p
                    className={cn(
                      'mt-1 text-2xl font-bold',
                      percentageColor(progress.percentageUsed),
                    )}
                  >
                    {progress.percentageUsed.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Radial chart */}
              <div className="flex justify-center">
                <div className="h-40 w-40" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="70%"
                      outerRadius="100%"
                      data={radialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={8}
                        fill={
                          progress.percentageUsed >= 100
                            ? '#ef4444'
                            : progress.percentageUsed >= 80
                              ? '#eab308'
                              : '#22c55e'
                        }
                        angleAxisId={0}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-700">
                  Desglose por categoria
                </h4>
                <div className="space-y-4">
                  {progress.items.map((item) => (
                    <div key={item.categoryId}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.categoryColor }}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium text-gray-800">
                            {item.categoryName}
                          </span>
                          {item.status === 'exceeded' && (
                            <Badge variant="destructive" className="text-xs">
                              Excedido
                            </Badge>
                          )}
                          {item.status === 'warning' && (
                            <Badge variant="warning" className="text-xs">
                              {item.percentageUsed.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatCurrency(item.spent, 'EUR')} de{' '}
                          {formatCurrency(item.budgeted, 'EUR')}
                        </span>
                      </div>
                      <Progress
                        value={item.percentageUsed}
                        className="h-2"
                        indicatorClassName={statusColor(item.status)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No se pudo cargar el progreso.</p>
          )}
        </DialogContent>
      </Dialog>

      <BudgetFormDialog
        budget={budget}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
