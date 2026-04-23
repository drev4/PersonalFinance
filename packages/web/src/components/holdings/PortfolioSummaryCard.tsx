import type React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency, formatPercentage } from '../../lib/formatters';
import type { PortfolioSummary, AssetType } from '../../types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CRYPTO_COLORS: Record<AssetType, string> = {
  crypto: '#F7931A',
  stock: '#2196F3',
  etf: '#4CAF50',
  bond: '#9E9E9E',
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  crypto: 'Cripto',
  stock: 'Acciones',
  etf: 'ETFs',
  bond: 'Bonos',
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface PillProps {
  type: AssetType;
  value: number;
  percentage: number;
  currency: string;
}

function AssetTypePill({ type, value, percentage, currency }: PillProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: CRYPTO_COLORS[type] }}
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-gray-600">{ASSET_TYPE_LABELS[type]}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900 truncate">
        {formatCurrency(value, currency)}
      </span>
      <span className="text-xs text-gray-400">{formatPercentage(percentage, 1)}</span>
    </div>
  );
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: { color: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="font-medium text-gray-700">{entry.name}</span>
      </div>
      <p className="mt-0.5 text-gray-500">{formatPercentage(entry.value, 1)}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PortfolioSummaryCardSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
          {/* Left: values */}
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-28" />
            {/* Pills */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
          {/* Right: chart */}
          <Skeleton className="mx-auto h-40 w-40 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PortfolioSummaryCardProps {
  data?: PortfolioSummary;
  isLoading: boolean;
  currency?: string;
}

export default function PortfolioSummaryCard({
  data,
  isLoading,
  currency = 'EUR',
}: PortfolioSummaryCardProps): React.ReactElement {
  if (isLoading) return <PortfolioSummaryCardSkeleton />;

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-400">
          No hay datos de portfolio disponibles.
        </CardContent>
      </Card>
    );
  }

  const isPnlPositive = data.totalPnl >= 0;
  const pnlColor = isPnlPositive ? 'text-green-600' : 'text-red-600';
  const PnlIcon = isPnlPositive ? TrendingUp : TrendingDown;

  // Build pie chart data — only include types with value > 0
  const pieData = data.byAssetType
    .filter((item) => item.value > 0)
    .map((item) => ({
      name: ASSET_TYPE_LABELS[item.type],
      value: item.percentage,
      color: CRYPTO_COLORS[item.type],
    }));

  // Ensure all 4 asset types appear in pills (even if 0)
  const ALL_TYPES: AssetType[] = ['crypto', 'stock', 'etf', 'bond'];
  const pillData = ALL_TYPES.map((type) => {
    const found = data.byAssetType.find((b) => b.type === type);
    return {
      type,
      value: found?.value ?? 0,
      percentage: found?.percentage ?? 0,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-600">
          Resumen del portfolio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          {/* ─── Left: numbers ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Total value */}
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Valor total
            </p>
            <p className="mt-1 text-4xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(data.totalValue, currency)}
            </p>

            {/* P&L */}
            <div className={`mt-2 flex items-center gap-1.5 ${pnlColor}`}>
              <PnlIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-base font-semibold tabular-nums">
                {isPnlPositive ? '+' : ''}
                {formatCurrency(data.totalPnl, currency)}
              </span>
              <span className="text-sm font-medium">
                ({isPnlPositive ? '+' : ''}
                {formatPercentage(data.totalPnlPercentage, 2)})
              </span>
            </div>

            {/* Total cost */}
            <p className="mt-1 text-sm text-gray-400">
              Coste total:{' '}
              <span className="font-medium text-gray-500">
                {formatCurrency(data.totalCost, currency)}
              </span>
            </p>

            {/* Distribution pills */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {pillData.map((pill) => (
                <AssetTypePill
                  key={pill.type}
                  type={pill.type}
                  value={pill.value}
                  percentage={pill.percentage}
                  currency={currency}
                />
              ))}
            </div>
          </div>

          {/* ─── Right: pie chart ──────────────────────────────────────────── */}
          {pieData.length > 0 && (
            <div className="mx-auto shrink-0" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    aria-label="Distribución del portfolio por tipo de activo"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
