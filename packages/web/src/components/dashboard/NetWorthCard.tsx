import type React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency } from '../../lib/formatters';
import type { NetWorthSummary, NetWorthPoint } from '../../types/api';
import { cn } from '../../lib/utils';

interface NetWorthCardProps {
  data: NetWorthSummary | undefined;
  history: NetWorthPoint[] | undefined;
  isLoading: boolean;
}

function formatCompact(cents: number, currency: string): string {
  const value = cents / 100;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '+';

  let formatted: string;
  if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}M`;
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}k`;
  } else {
    formatted = abs.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${sign}${currencySymbol}${formatted}`;
}

function getMonthlyVariation(
  current: number,
  history: NetWorthPoint[] | undefined,
): { amount: number; percent: number } | null {
  if (!history || history.length < 2) return null;

  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const previous = sorted[sorted.length - 2];
  if (!previous) return null;

  const diff = current - previous.total;
  const percent = previous.total !== 0 ? (diff / Math.abs(previous.total)) * 100 : 0;

  return { amount: diff, percent };
}

export default function NetWorthCard({
  data,
  history,
  isLoading,
}: NetWorthCardProps): React.ReactElement {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-3 h-10 w-48" />
          <Skeleton className="mb-4 h-5 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-600">Patrimonio neto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">Sin datos disponibles.</p>
        </CardContent>
      </Card>
    );
  }

  const variation = getMonthlyVariation(data.total, history);
  const isPositiveVariation = variation ? variation.amount >= 0 : true;
  const currency = data.currency;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-600">Patrimonio neto</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total */}
        <p
          className="mb-1 text-4xl font-bold tracking-tight text-gray-900"
          aria-label={`Patrimonio neto: ${formatCurrency(data.total, currency)}`}
        >
          {formatCurrency(data.total, currency)}
        </p>

        {/* Monthly variation */}
        {variation && (
          <div
            className={cn(
              'mb-4 flex items-center gap-1 text-sm font-medium',
              isPositiveVariation ? 'text-green-600' : 'text-red-600',
            )}
          >
            {isPositiveVariation ? (
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {formatCompact(variation.amount, currency)} (
              {variation.percent >= 0 ? '+' : ''}
              {variation.percent.toLocaleString('es-ES', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %)
            </span>
            <span className="text-xs font-normal text-gray-400">vs mes anterior</span>
          </div>
        )}

        {/* Breakdown pills */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" className="gap-1 px-3 py-1 text-xs">
            <span className="font-normal text-green-600">Activos</span>
            <span className="font-semibold">{formatCurrency(data.assets, currency)}</span>
          </Badge>
          <Badge variant="destructive" className="gap-1 px-3 py-1 text-xs">
            <span className="font-normal text-red-600">Pasivos</span>
            <span className="font-semibold">{formatCurrency(data.liabilities, currency)}</span>
          </Badge>
          <Badge variant="default" className="gap-1 px-3 py-1 text-xs">
            <span className="font-normal text-primary-600">Inversiones</span>
            <span className="font-semibold">
              {formatCurrency(data.breakdown.investments, currency)}
            </span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
