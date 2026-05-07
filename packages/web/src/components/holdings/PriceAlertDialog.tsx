import { Bell, BellOff, Trash2, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';
import {
  usePriceAlerts,
  useCreatePriceAlert,
  useDeletePriceAlert,
  useTogglePriceAlert,
} from '../../hooks/usePriceAlerts';
import { formatCurrency } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { HoldingWithValue, PriceAlert } from '../../types/api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';

// ─── Alert row ────────────────────────────────────────────────────────────────

interface AlertRowProps {
  alert: PriceAlert;
  currency: string;
  holdingId: string;
}

function AlertRow({ alert, currency, holdingId }: AlertRowProps): React.ReactElement {
  const toggle = useTogglePriceAlert();
  const remove = useDeletePriceAlert();

  const isAbove = alert.condition === 'above';
  const ConditionIcon = isAbove ? TrendingUp : TrendingDown;
  const conditionColor = isAbove ? 'text-green-600' : 'text-red-600';

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm',
        alert.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <ConditionIcon className={cn('h-4 w-4 shrink-0', conditionColor)} aria-hidden="true" />
        <span className="text-gray-700">
          {isAbove ? 'Por encima de' : 'Por debajo de'}{' '}
          <span className="font-semibold tabular-nums">
            {formatCurrency(alert.targetPrice, currency)}
          </span>
        </span>
        {!alert.isActive && <span className="text-xs text-gray-400 shrink-0">Pausada</span>}
        {alert.triggeredAt && <span className="text-xs text-amber-600 shrink-0">Disparada</span>}
      </div>

      <div className="flex items-center gap-1 ml-2 shrink-0">
        <button
          type="button"
          onClick={() => toggle.mutate({ id: alert._id, holdingId })}
          disabled={toggle.isPending}
          title={alert.isActive ? 'Pausar alerta' : 'Activar alerta'}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          {alert.isActive ? (
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => remove.mutate({ id: alert._id, holdingId })}
          disabled={remove.isPending}
          title="Eliminar alerta"
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

interface CreateFormProps {
  holding: HoldingWithValue;
  onCreated: () => void;
}

function CreateForm({ holding, onCreated }: CreateFormProps): React.ReactElement {
  const create = useCreatePriceAlert();
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(price.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setError('Introduce un precio válido.');
      return;
    }

    try {
      await create.mutateAsync({
        holdingId: holding._id,
        condition,
        targetPrice: Math.round(parsed * 100),
      });
      setPrice('');
      onCreated();
    } catch {
      setError('No se pudo crear la alerta. Inténtalo de nuevo.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dashed border-gray-200 p-3"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nueva alerta</p>

      {/* Condition toggle */}
      <div className="flex gap-2">
        {(['above', 'below'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCondition(c)}
            className={cn(
              'flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              condition === c
                ? c === 'above'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-red-600 bg-red-50 text-red-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {c === 'above' ? '↑ Por encima de' : '↓ Por debajo de'}
          </button>
        ))}
      </div>

      {/* Price input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={
              holding.currentPrice
                ? `Actual: ${(holding.currentPrice / 100).toFixed(2)}`
                : 'Precio objetivo'
            }
            required
            className="pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {holding.currency}
          </span>
        </div>
        <Button type="submit" size="sm" disabled={create.isPending}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface PriceAlertDialogProps {
  holding: HoldingWithValue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PriceAlertDialog({
  holding,
  open,
  onOpenChange,
}: PriceAlertDialogProps): React.ReactElement {
  const { data: alerts = [], isLoading } = usePriceAlerts(open ? holding._id : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Alertas de precio — {holding.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Current price hint */}
          {holding.currentPrice !== undefined && holding.currentPrice !== null && (
            <p className="text-sm text-gray-500">
              Precio actual:{' '}
              <span className="font-medium text-gray-800 tabular-nums">
                {formatCurrency(holding.currentPrice, holding.currency)}
              </span>
            </p>
          )}

          {/* Existing alerts */}
          {isLoading ? (
            <p className="text-sm text-gray-400">Cargando alertas...</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-gray-400">No hay alertas configuradas para este activo.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert._id}
                  alert={alert}
                  currency={holding.currency}
                  holdingId={holding._id}
                />
              ))}
            </div>
          )}

          {/* Create form */}
          <CreateForm holding={holding} onCreated={() => {}} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
