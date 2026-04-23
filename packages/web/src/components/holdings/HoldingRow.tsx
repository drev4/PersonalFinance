import * as React from 'react';
import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { TableRow, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { formatCurrency, formatPercentage, formatDate } from '../../lib/formatters';
import type { HoldingWithValue, AssetType } from '../../types/api';
import { cn } from '../../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  crypto: 'Cripto',
  stock: 'Accion',
  etf: 'ETF',
  bond: 'Bono',
};

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const ASSET_TYPE_BADGE_VARIANTS: Record<AssetType, BadgeVariant> = {
  crypto: 'warning',
  stock: 'default',
  etf: 'success',
  bond: 'outline',
};

const SOURCE_ICONS: Record<string, string> = {
  binance: '🤖',
  csv_import: '📊',
  manual: '✏️',
};

// ─── Kebab menu ───────────────────────────────────────────────────────────────

interface KebabMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

function KebabMenu({ onEdit, onDelete }: KebabMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'rounded p-1 text-gray-400 transition-colors',
          'hover:bg-gray-100 hover:text-gray-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        )}
        aria-label="Acciones del holding"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-50 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg',
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4 text-gray-400" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main row ─────────────────────────────────────────────────────────────────

interface HoldingRowProps {
  holding: HoldingWithValue;
  onEdit: (holding: HoldingWithValue) => void;
  onDelete: (holding: HoldingWithValue) => void;
}

export default function HoldingRow({
  holding,
  onEdit,
  onDelete,
}: HoldingRowProps): React.ReactElement {
  const isPnlPositive = holding.pnl >= 0;
  const pnlColor = isPnlPositive ? 'text-green-600' : 'text-red-600';
  const PnlIcon = isPnlPositive ? TrendingUp : TrendingDown;

  const priceTooltip = holding.priceUpdatedAt
    ? `Precio actualizado ${formatDate(holding.priceUpdatedAt, 'relative')}`
    : 'Precio no disponible';

  const formattedQuantity = holding.quantity;

  // currentValue and totalCost already come in cents from the backend computed fields
  const displayValue =
    holding.currentValue > 0
      ? formatCurrency(holding.currentValue, holding.currency)
      : '—';

  const displayCurrentPrice =
    holding.currentPrice !== undefined && holding.currentPrice !== null
      ? formatCurrency(holding.currentPrice, holding.currency)
      : '—';

  return (
    <TableRow>
      {/* Symbol + exchange */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            aria-label={`Fuente: ${holding.source}`}
            title={`Fuente: ${holding.source}`}
          >
            {SOURCE_ICONS[holding.source] ?? '✏️'}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{holding.symbol}</p>
            {holding.exchange && (
              <p className="text-xs text-gray-400">{holding.exchange}</p>
            )}
          </div>
        </div>
      </TableCell>

      {/* Asset type badge */}
      <TableCell>
        <Badge variant={ASSET_TYPE_BADGE_VARIANTS[holding.assetType]}>
          {ASSET_TYPE_LABELS[holding.assetType]}
        </Badge>
      </TableCell>

      {/* Quantity */}
      <TableCell className="tabular-nums text-gray-700">
        {formattedQuantity}
      </TableCell>

      {/* Current price */}
      <TableCell
        className="tabular-nums"
        title={priceTooltip}
        aria-label={`${displayCurrentPrice} — ${priceTooltip}`}
      >
        <span className="cursor-help border-b border-dashed border-gray-300">
          {displayCurrentPrice}
        </span>
      </TableCell>

      {/* Total value */}
      <TableCell className="tabular-nums font-medium text-gray-900">
        {displayValue}
      </TableCell>

      {/* P&L */}
      <TableCell>
        <div className={cn('flex items-center gap-1 tabular-nums', pnlColor)}>
          <PnlIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isPnlPositive ? '+' : ''}
              {formatCurrency(holding.pnl, holding.currency)}
            </span>
            <span className="text-xs">
              ({isPnlPositive ? '+' : ''}
              {formatPercentage(holding.pnlPercentage, 2)})
            </span>
          </div>
        </div>
      </TableCell>

      {/* Portfolio % */}
      <TableCell className="tabular-nums text-gray-600">
        {formatPercentage(holding.portfolioPercentage, 1)}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <KebabMenu
          onEdit={() => onEdit(holding)}
          onDelete={() => onDelete(holding)}
        />
      </TableCell>
    </TableRow>
  );
}
