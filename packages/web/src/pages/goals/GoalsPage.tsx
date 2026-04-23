import { useState } from 'react';
import type React from 'react';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { GoalCard } from '../../components/goals/GoalCard';
import { GoalFormDialog } from '../../components/goals/GoalFormDialog';
import { useGoals } from '../../hooks/useGoals';

function GoalsSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function GoalsPage(): React.ReactElement {
  const [formOpen, setFormOpen] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const { data: goals, isLoading } = useGoals();

  const activeGoals = goals?.filter((g) => !g.isCompleted && g.isActive) ?? [];
  const completedGoals = goals?.filter((g) => g.isCompleted) ?? [];
  const hasAny = (goals?.length ?? 0) > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metas de ahorro</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define y sigue el progreso de tus objetivos financieros.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <span aria-hidden="true">+</span>
          Nueva meta
        </Button>
      </div>

      {isLoading ? (
        <GoalsSkeleton />
      ) : !hasAny ? (
        <EmptyState
          icon={<Target className="h-8 w-8" aria-hidden="true" />}
          title="Sin metas de ahorro"
          description="Crea tu primera meta para empezar a ahorrar hacia tus objetivos."
          action={{
            label: '+ Nueva meta',
            onClick: () => setFormOpen(true),
          }}
        />
      ) : (
        <>
          {/* En progreso */}
          {activeGoals.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                En progreso
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({activeGoals.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal) => (
                  <GoalCard key={goal._id} goal={goal} />
                ))}
              </div>
            </section>
          )}

          {activeGoals.length === 0 && (
            <EmptyState
              icon={<Target className="h-7 w-7" aria-hidden="true" />}
              title="Todas las metas completadas"
              description="Crea una nueva meta para seguir ahorrando."
              action={{
                label: '+ Nueva meta',
                onClick: () => setFormOpen(true),
              }}
            />
          )}

          {/* Completadas — colapsable */}
          {completedGoals.length > 0 && (
            <section>
              <button
                className="flex w-full items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100"
                onClick={() => setCompletedExpanded((v) => !v)}
                aria-expanded={completedExpanded}
              >
                <span className="text-sm font-semibold text-green-800">
                  Metas completadas ({completedGoals.length})
                </span>
                {completedExpanded ? (
                  <ChevronUp className="h-4 w-4 text-green-600" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-green-600" aria-hidden="true" />
                )}
              </button>

              {completedExpanded && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completedGoals.map((goal) => (
                    <GoalCard key={goal._id} goal={goal} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
