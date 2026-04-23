import type React from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency } from '../../lib/formatters';
import { useDashboardCashflow } from '../../hooks/useDashboard';
import { cn } from '../../lib/utils';

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: 'positive' | 'negative' | 'neutral';
  isLoading: boolean;
}

function StatCard({
  label,
  value,
  icon,
  trend,
  isLoading,
}: StatCardProps): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p
                className={cn(
                  'mt-1 text-xl font-bold',
                  trend === 'positive' && 'text-green-600',
                  trend === 'negative' && 'text-red-600',
                  trend === 'neutral' && 'text-gray-900',
                )}
              >
                {value}
              </p>
            </div>
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                trend === 'positive' && 'bg-green-50 text-green-600',
                trend === 'negative' && 'bg-red-50 text-red-600',
                trend === 'neutral' && 'bg-gray-50 text-gray-400',
              )}
              aria-hidden="true"
            >
              {icon}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickStatsRow(): React.ReactElement {
  const { data, isLoading } = useDashboardCashflow(1);

  // Use the most recent month entry (last in array)
  const currentMonth = data && data.length > 0 ? data[data.length - 1] : null;

  const income = currentMonth?.income ?? 0;
  const expenses = currentMonth?.expenses ?? 0;
  const balance = currentMonth?.net ?? income - expenses;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  const CURRENCY = 'EUR';

  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      role="region"
      aria-label="Estadisticas rapidas del mes"
    >
      <StatCard
        label="Ingresos del mes"
        value={formatCurrency(income, CURRENCY)}
        icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        trend="positive"
        isLoading={isLoading}
      />
      <StatCard
        label="Gastos del mes"
        value={formatCurrency(expenses, CURRENCY)}
        icon={<TrendingDown className="h-5 w-5" aria-hidden="true" />}
        trend="negative"
        isLoading={isLoading}
      />
      <StatCard
        label="Balance del mes"
        value={formatCurrency(balance, CURRENCY)}
        icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
        trend={balance >= 0 ? 'positive' : 'negative'}
        isLoading={isLoading}
      />
      <StatCard
        label="Tasa de ahorro"
        value={income > 0 ? `${savingsRate.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%` : '—'}
        icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
        trend={savingsRate > 0 ? 'positive' : savingsRate < 0 ? 'negative' : 'neutral'}
        isLoading={isLoading}
      />
    </div>
  );
}
