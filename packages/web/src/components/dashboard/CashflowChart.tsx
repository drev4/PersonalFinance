import { useState } from 'react';
import type React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';
import { useDashboardCashflow } from '../../hooks/useDashboard';
import type { CashflowMonth } from '../../types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_ABBR_ES: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic',
};

function formatMonthLabel(month: string): string {
  // month format: "2024-03" or "2024-03-01"
  const parts = month.split('-');
  const mm = parts[1] ?? '';
  return MONTH_ABBR_ES[mm] ?? month;
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

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const TOOLTIP_LABELS: Record<string, string> = {
  income: 'Ingresos',
  expenses: 'Gastos',
  net: 'Neto',
};

function CustomTooltip({ active, payload, label }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0 || !label) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-2 text-xs font-semibold text-gray-600">{formatMonthLabel(label)}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
          <span style={{ color: entry.color }}>{TOOLTIP_LABELS[entry.name] ?? entry.name}</span>
          <span className="font-medium text-gray-900">{formatYAxis(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Custom legend ────────────────────────────────────────────────────────────

interface LegendPayloadItem {
  value: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadItem[];
}

function CustomLegend({ payload }: CustomLegendProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      {payload?.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          {TOOLTIP_LABELS[entry.value] ?? entry.value}
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const MONTH_OPTIONS: { label: string; value: number }[] = [
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

export default function CashflowChart(): React.ReactElement {
  const [months, setMonths] = useState<number>(6);
  const { data, isLoading } = useDashboardCashflow(months);

  const hasData = !isLoading && data && data.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-600">
            Flujo de caja mensual
          </CardTitle>

          {/* Month range selector */}
          <div
            className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5"
            role="group"
            aria-label="Seleccionar rango"
          >
            {MONTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMonths(opt.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  months === opt.value
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
                aria-pressed={months === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading */}
        {isLoading && (
          <Skeleton className="h-[300px] w-full" aria-label="Cargando grafico de flujo de caja" />
        )}

        {/* Empty */}
        {!isLoading && (!data || data.length === 0) && (
          <div
            className="flex h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center"
            role="status"
          >
            <BarChart2 className="mb-3 h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-500">Sin datos de flujo de caja.</p>
          </div>
        )}

        {/* Chart */}
        {hasData && (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={data as CashflowMonth[]}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
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
              <Legend content={<CustomLegend />} />
              <Bar
                dataKey="income"
                name="income"
                fill="#22c55e"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="expenses"
                name="expenses"
                fill="#ef4444"
                radius={[3, 3, 0, 0]}
                maxBarSize={32}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="net"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
