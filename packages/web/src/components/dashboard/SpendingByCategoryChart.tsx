import { useState, useCallback } from 'react';
import type React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { useDashboardSpendingByCategory } from '../../hooks/useDashboard';
import { formatCurrency } from '../../lib/formatters';
import type { CategorySpendingItem } from '../../types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function monthLabel(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: es });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  payload: CategorySpendingItem;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-0.5 text-xs font-medium text-gray-700">{item.payload.name}</p>
      <p className="text-sm font-semibold text-gray-900">
        {formatCurrency(item.payload.total, 'EUR')}
      </p>
      <p className="text-xs text-gray-400">{item.payload.percentage.toFixed(1)}%</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpendingByCategoryChart(): React.ReactElement {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));

  const from = isoDate(startOfMonth(currentMonth));
  const to = isoDate(endOfMonth(currentMonth));

  const { data, isLoading } = useDashboardSpendingByCategory(from, to);

  const canGoForward = startOfMonth(addMonths(currentMonth, 1)) <= startOfMonth(today);

  const handlePrev = useCallback(() => {
    setCurrentMonth((prev) => startOfMonth(subMonths(prev, 1)));
  }, []);

  const handleNext = useCallback(() => {
    if (canGoForward) {
      setCurrentMonth((prev) => startOfMonth(addMonths(prev, 1)));
    }
  }, [canGoForward]);

  const totalCents = data?.reduce((sum, item) => sum + item.total, 0) ?? 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-600">
            Gastos por categoria
          </CardTitle>

          {/* Month navigator */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-[110px] text-center text-xs font-medium text-gray-600">
              {capitalizeFirst(monthLabel(currentMonth))}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoForward}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Mes siguiente"
              aria-disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!data || data.length === 0) && (
          <div
            className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center"
            role="status"
          >
            <ShoppingBag className="mb-3 h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-500">Sin gastos este mes.</p>
          </div>
        )}

        {/* Chart + legend */}
        {!isLoading && data && data.length > 0 && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Donut */}
            <div className="relative shrink-0">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="name"
                    isAnimationActive
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.categoryId}-${index}`}
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label rendered outside recharts for better control */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-400">Total</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(totalCents, 'EUR')}
                </span>
              </div>
            </div>

            {/* Legend */}
            <ul className="flex-1 space-y-1.5" aria-label="Leyenda de gastos por categoria">
              {data.map((item) => (
                <li
                  key={item.categoryId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-gray-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {item.percentage.toFixed(1)}%
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(item.total, 'EUR')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
