import type React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../lib/formatters';
import type { BudgetItemProgress } from '../../types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str: string, max = 12): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

interface ChartRow {
  name: string;
  fullName: string;
  budgeted: number;
  spent: number;
  color: string;
  status: BudgetItemProgress['status'];
}

function buildChartData(items: BudgetItemProgress[]): ChartRow[] {
  return items.map((item) => ({
    name: truncate(item.categoryName),
    fullName: item.categoryName,
    budgeted: item.budgeted / 100,
    spent: item.spent / 100,
    color: item.categoryColor,
    status: item.status,
  }));
}

function barColor(status: BudgetItemProgress['status']): string {
  if (status === 'exceeded') return '#FF4757';
  if (status === 'warning') return '#F59E0B';
  return '#00C896';
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  payload: ChartRow;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length < 2) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const budgeted = payload.find((p) => p.name === 'Presupuestado');
  const spent = payload.find((p) => p.name === 'Gastado');
  const pct = budgeted?.value ? ((spent?.value ?? 0) / budgeted.value) * 100 : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-md text-xs">
      <p className="mb-1.5 font-semibold text-gray-800">{row.fullName}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="inline-block h-2 w-2 rounded-full bg-primary-500" />
            Presupuestado
          </span>
          <span className="font-medium text-gray-900">
            {formatCurrency((budgeted?.value ?? 0) * 100, 'EUR')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: barColor(row.status) }}
            />
            Gastado
          </span>
          <span className="font-medium" style={{ color: barColor(row.status) }}>
            {formatCurrency((spent?.value ?? 0) * 100, 'EUR')}
          </span>
        </div>
        <div className="mt-0.5 border-t border-gray-100 pt-1 flex items-center justify-between">
          <span className="text-gray-400">Uso</span>
          <span className="font-semibold" style={{ color: barColor(row.status) }}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Spent bar with per-item coloring ─────────────────────────────────────────

interface SpentCellsProps {
  data: ChartRow[];
}

function SpentCells({ data }: SpentCellsProps): React.ReactElement {
  return (
    <>
      {data.map((entry) => (
        <Cell key={`spent-${entry.fullName}`} fill={barColor(entry.status)} />
      ))}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BudgetComparisonChartProps {
  items: BudgetItemProgress[];
}

export function BudgetComparisonChart({ items }: BudgetComparisonChartProps): React.ReactElement {
  const data = buildChartData(items);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">Sin categorías en este presupuesto.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 52)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        barCategoryGap="28%"
        barGap={4}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f0f0f5" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v}€`}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={84}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 8 }}
        />
        <Bar
          dataKey="budgeted"
          name="Presupuestado"
          fill="#0052CC"
          radius={[0, 4, 4, 0]}
          maxBarSize={16}
        />
        <Bar dataKey="spent" name="Gastado" radius={[0, 4, 4, 0]} maxBarSize={16}>
          <SpentCells data={data} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
