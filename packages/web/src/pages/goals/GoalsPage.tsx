import { Plus, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { GoalCard } from '../../components/goals/GoalCard';
import { GoalFormDialog } from '../../components/goals/GoalFormDialog';
import { Amount } from '../../components/ui/Amount';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { TopBar } from '../../components/ui/TopBar';
import { useGoals } from '../../hooks/useGoals';

function GoalsSkeleton(): React.ReactElement {
  return (
    <div className="web-grid-3">
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
  const totalSaved = goals?.reduce((s, g) => s + g.currentAmount, 0) ?? 0;

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <TopBar
        title="Metas de ahorro"
        subtitle={`${activeGoals.length} ${activeGoals.length === 1 ? 'meta activa' : 'metas activas'}`}
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
            Nueva meta
          </button>
        }
      />

      <div style={{ padding: '28px 40px 60px', overflow: 'auto', flex: 1 }}>
        {/* Total saved header */}
        {(goals?.length ?? 0) > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Ahorrado en total</div>
            <Amount value={totalSaved} size={44} />
          </div>
        )}

        {isLoading ? (
          <GoalsSkeleton />
        ) : (goals?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Target className="h-8 w-8" aria-hidden="true" />}
            title="Sin metas de ahorro"
            description="Crea tu primera meta para empezar a ahorrar hacia tus objetivos."
            action={{ label: '+ Nueva meta', onClick: () => setFormOpen(true) }}
          />
        ) : (
          <>
            {activeGoals.length > 0 ? (
              <div className="web-grid-3">
                {activeGoals.map((goal) => (
                  <GoalCard key={goal._id} goal={goal} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Target className="h-7 w-7" aria-hidden="true" />}
                title="Todas las metas completadas"
                description="Crea una nueva meta para seguir ahorrando."
                action={{ label: '+ Nueva meta', onClick: () => setFormOpen(true) }}
              />
            )}

            {/* Completed goals */}
            {completedGoals.length > 0 && (
              <section style={{ marginTop: 32 }}>
                <button
                  onClick={() => setCompletedExpanded((v) => !v)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--hairline)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    color: 'var(--text-2)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                  aria-expanded={completedExpanded}
                >
                  <span>Metas completadas ({completedGoals.length})</span>
                  {completedExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {completedExpanded && (
                  <div className="web-grid-3" style={{ marginTop: 16 }}>
                    {completedGoals.map((goal) => (
                      <GoalCard key={goal._id} goal={goal} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
