import { useState } from 'react';
import type React from 'react';
import {
  PiggyBank,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Star,
  ShoppingBag,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { GoalProgressDialog } from './GoalProgressDialog';
import { GoalFormDialog } from './GoalFormDialog';
import { useDeleteGoal } from '../../hooks/useGoals';
import type { Goal } from '../../types/api';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  PiggyBank,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Star,
  ShoppingBag,
};

interface GoalCardProps {
  goal: Goal;
}

function monthsUntil(deadlineStr: string): number {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const diffMs = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
}

function daysUntil(deadlineStr: string): number {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function RadialProgress({
  value,
  color,
  size = 72,
}: {
  value: number;
  color: string;
  size?: number;
}): React.ReactElement {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
      />
    </svg>
  );
}

export function GoalCard({ goal }: GoalCardProps): React.ReactElement {
  const [progressOpen, setProgressOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const deleteGoal = useDeleteGoal();

  const color = goal.color ?? '#6366f1';
  const IconComponent = ICON_MAP[goal.icon ?? ''] ?? PiggyBank;

  const pct =
    goal.targetAmount > 0
      ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
      : 0;

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  let deadlineInfo: { label: string; urgent: boolean } | null = null;
  let monthlyNeeded: number | null = null;

  if (goal.deadline) {
    const days = daysUntil(goal.deadline);
    const months = monthsUntil(goal.deadline);
    const urgent = days < 30;

    if (days <= 0) {
      deadlineInfo = { label: 'Vencida', urgent: true };
    } else if (months < 1) {
      deadlineInfo = { label: `${days} dias restantes`, urgent: true };
    } else {
      deadlineInfo = {
        label: `Vence: ${formatDate(goal.deadline)}`,
        urgent,
      };
    }

    if (months > 0 && remaining > 0) {
      monthlyNeeded = remaining / months;
    }
  }

  function handleDelete(): void {
    if (window.confirm(`¿Eliminar la meta "${goal.name}"?`)) {
      void deleteGoal.mutateAsync(goal._id);
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
                    disabled={deleteGoal.isPending}
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
          {/* Icon + Name */}
          <div className="flex items-center gap-3 pr-8">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}20` }}
              aria-hidden="true"
            >
              <IconComponent className="h-5 w-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900">{goal.name}</h3>
              {goal.isCompleted && (
                <Badge variant="success" className="gap-1 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Completada
                </Badge>
              )}
            </div>
          </div>

          {/* Radial + amounts */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <RadialProgress value={pct} color={color} size={72} />
              <span
                className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{ color }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(goal.currentAmount, 'EUR')}
              </p>
              <p className="text-xs text-gray-500">
                de {formatCurrency(goal.targetAmount, 'EUR')}
              </p>

              {deadlineInfo && (
                <p
                  className={cn(
                    'mt-1 text-xs',
                    deadlineInfo.urgent ? 'font-medium text-red-600' : 'text-gray-500',
                  )}
                >
                  {deadlineInfo.label}
                </p>
              )}
              {monthlyNeeded !== null && !goal.isCompleted && (
                <p className="text-xs text-gray-400">
                  Aporta {formatCurrency(Math.round(monthlyNeeded), 'EUR')}/mes
                </p>
              )}
            </div>
          </div>

          {/* Action */}
          {!goal.isCompleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgressOpen(true)}
              className="w-full"
              style={{ borderColor: `${color}60`, color }}
            >
              Actualizar progreso
            </Button>
          )}
        </CardContent>
      </Card>

      <GoalProgressDialog
        goal={goal}
        open={progressOpen}
        onOpenChange={setProgressOpen}
      />
      <GoalFormDialog
        goal={goal}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
