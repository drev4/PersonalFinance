import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency, formatPercentage } from '../../lib/formatters';
import { usePortfolioSummary } from '../../hooks/useHoldings';
import type { HoldingWithValue } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col items-end space-y-1">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

// ─── Holding row ──────────────────────────────────────────────────────────────

const ASSET_COLORS: Record<string, string> = {
  crypto: '#F7931A',
  stock: '#2196F3',
  etf: '#4CAF50',
  bond: '#9E9E9E',
};

interface HoldingItemProps {
  holding: HoldingWithValue;
}

function HoldingItem({ holding }: HoldingItemProps): React.ReactElement {
  const isPnlPositive = holding.pnl >= 0;
  const pnlColor = isPnlPositive ? 'text-green-600' : 'text-red-600';
  const PnlIcon = isPnlPositive ? TrendingUp : TrendingDown;
  const assetColor = ASSET_COLORS[holding.assetType] ?? '#94a3b8';

  return (
    <li className="flex items-center gap-3 py-2.5">
      {/* Color badge */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${assetColor}22` }}
        aria-hidden="true"
      >
        <span
          className="text-xs font-bold"
          style={{ color: assetColor }}
        >
          {holding.symbol.slice(0, 2)}
        </span>
      </div>

      {/* Symbol + exchange */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{holding.symbol}</p>
        <p className="text-xs text-gray-400">
          {holding.portfolioPercentage > 0
            ? `${formatPercentage(holding.portfolioPercentage, 1)} del portfolio`
            : holding.assetType}
        </p>
      </div>

      {/* Value + P&L */}
      <div className="flex flex-col items-end shrink-0">
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          {formatCurrency(holding.currentValue, holding.currency)}
        </span>
        <span className={cn('flex items-center gap-0.5 text-xs tabular-nums', pnlColor)}>
          <PnlIcon className="h-3 w-3" aria-hidden="true" />
          {isPnlPositive ? '+' : ''}
          {formatPercentage(holding.pnlPercentage, 2)}
        </span>
      </div>
    </li>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

const MAX_HOLDINGS = 5;

export default function TopHoldingsWidget(): React.ReactElement {
  const { data, isLoading } = usePortfolioSummary();

  const topHoldings: HoldingWithValue[] = data?.topHoldings
    ? data.topHoldings.slice(0, MAX_HOLDINGS)
    : [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-600">
            Top inversiones
          </CardTitle>
          <BarChart2 className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Loading */}
        {isLoading && (
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && topHoldings.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <TrendingUp className="h-8 w-8 text-gray-300" aria-hidden="true" />
              <p className="text-sm text-gray-400">No hay inversiones todavia.</p>
              <Link
                to="/holdings"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
              >
                Anadir posicion
              </Link>
            </div>
          </div>
        )}

        {/* List */}
        {!isLoading && topHoldings.length > 0 && (
          <>
            <ul
              className="divide-y divide-gray-100"
              aria-label="Top posiciones del portfolio"
            >
              {topHoldings.map((holding) => (
                <HoldingItem key={holding._id} holding={holding} />
              ))}
            </ul>

            {/* Footer link */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <Link
                to="/holdings"
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Ver todas las inversiones
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
