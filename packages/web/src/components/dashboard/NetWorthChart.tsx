import { useState } from 'react';
import type React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';
import { useNetWorthHistory } from '../../hooks/useDashboard';
import type { NetWorthHistoryPeriod } from '../../types/api';

// ─── Period selector ──────────────────────────────────────────────────────────

const PERIODS: { label: string; value: NetWorthHistoryPeriod }[] = [
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1A', value: '1y' },
  { label: 'Todo', value: 'all' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAxisDate(dateStr: string, period: NetWorthHistoryPeriod): string {
  try {
    const date = parseISO(dateStr);
    if (period === '1m') return format(date, 'd MMM', { locale: es });
    if (period === '3m') return format(date, 'd MMM', { locale: es });
    return format(date, 'MMM yy', { locale: es });
  } catch {
    return dateStr;
  }
}

function formatYAxis(cents: number): string {
  const value = cents / 100;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    return `${sign}€${(abs / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}€${(abs / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}k`;
  }
  return `${sign}€${abs.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0 || !label) return null;

  const value = payload[0]?.value ?? 0;
  let dateLabel = label;
  try {
    dateLabel = format(parseISO(label), "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    /* use raw label */
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-0.5 text-xs text-gray-500">{dateLabel}</p>
      <p className="text-sm font-semibold text-gray-900">{formatYAxis(value)}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NetWorthChart(): React.ReactElement {
  const [period, setPeriod] = useState<NetWorthHistoryPeriod>('6m');
  const { data, isLoading } = useNetWorthHistory(period);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-600">
            Evolución del patrimonio
          </CardTitle>

          {/* Period selector */}
          <div
            className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5"
            role="group"
            aria-label="Seleccionar período"
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  period === p.value
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
                aria-pressed={period === p.value}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <Skeleton className="h-[300px] w-full" aria-label="Cargando gráfico de patrimonio" />
        )}

        {!isLoading && (!data || data.length === 0) && (
          <div
            className="flex h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center"
            role="status"
          >
            <TrendingUp className="mb-3 h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-500">Aun no hay historial.</p>
            <p className="mt-1 text-xs text-gray-400">
              El grafico se actualizara manana.
            </p>
          </div>
        )}

        {!isLoading && data && data.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => formatAxisDate(v, period)}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#netWorthGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
