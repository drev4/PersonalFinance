import { useState } from 'react';
import type React from 'react';
import { MoreVertical, Eye, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { BudgetDetailDialog } from './BudgetDetailDialog';
import { BudgetFormDialog } from './BudgetFormDialog';
import { useBudgetProgress, useDeleteBudget } from '../../hooks/useBudgets';
import type { Budget } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface BudgetCardProps {
  budget: Budget;
}

function percentageColor(pct: number): string {
  if (pct >= 100) return 'text-red-600';
  if (pct >= 80) return 'text-yellow-600';
  return 'text-green-600';
}

function progressIndicatorColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-yellow-400';
  return 'bg-primary-600';
}

export function BudgetCard({ budget }: BudgetCardProps): React.ReactElement {
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: progress, isLoading } = useBudgetProgress(budget._id);
  const deleteBudget = useDeleteBudget();

  function handleDelete(): void {
    if (window.confirm(`¿Eliminar el presupuesto "${budget.name}"?`)) {
      void deleteBudget.mutateAsync(budget._id);
    }
    setMenuOpen(false);
  }

  return (
    <>
      <Card className="relative flex flex-col transition-shadow hover:shadow-md">
        {/* Kebab menu */}
        <div className="absolute right-3 top-3 z-10">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Mas opciones"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setEditOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={handleDelete}
                    disabled={deleteBudget.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <CardContent className="pt-5 flex flex-col gap-4">
          {/* Header */}
          <div className="pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{budget.name}</h3>
              <Badge variant="outline">
                {budget.period === 'monthly' ? 'Mensual' : 'Anual'}
              </Badge>
              {budget.rollover && (
                <Badge variant="default" className="gap-1">
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Rollover
                </Badge>
              )}
            </div>
          </div>

          {/* Progress */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : progress ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatCurrency(progress.totalSpent, 'EUR')} gastados
                </span>
                <span
                  className={cn('text-sm font-bold', percentageColor(progress.percentageUsed))}
                >
                  {progress.percentageUsed.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={progress.percentageUsed}
                className="h-2.5"
                indicatorClassName={progressIndicatorColor(progress.percentageUsed)}
              />
              <p className="text-xs text-gray-500">
                de {formatCurrency(progress.totalBudgeted, 'EUR')} presupuestados
              </p>
            </div>
          ) : null}

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDetailOpen(true)}
            className="w-full gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Ver detalle
          </Button>
        </CardContent>
      </Card>

      <BudgetDetailDialog
        budget={budget}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <BudgetFormDialog
        budget={budget}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
