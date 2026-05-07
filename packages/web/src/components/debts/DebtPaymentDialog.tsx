import { useState, useEffect } from 'react';
import type React from 'react';
import { usePayDebt } from '../../hooks/useDebts';
import { formatCurrency } from '../../lib/formatters';
import type { Debt } from '../../types/api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';

interface DebtPaymentDialogProps {
  debt: Debt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebtPaymentDialog({
  debt,
  open,
  onOpenChange,
}: DebtPaymentDialogProps): React.ReactElement {
  const pay = usePayDebt();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRaw('');
      setError('');
    }
  }, [open]);

  const amountCents = Math.round(parseFloat(raw.replace(',', '.')) * 100) || 0;
  const newBalance = Math.max(0, debt.currentBalance - amountCents);
  const paidAfter = debt.originalAmount - newBalance;
  const pct = debt.originalAmount > 0 ? Math.min(100, (paidAfter / debt.originalAmount) * 100) : 0;

  async function handleConfirm(): Promise<void> {
    if (amountCents <= 0) {
      setError('Introduce un importe válido');
      return;
    }
    setError('');
    await pay.mutateAsync({ id: debt._id, amount: amountCents });
    onOpenChange(false);
  }

  const minPaymentHint =
    debt.minimumPayment > 0 ? formatCurrency(debt.minimumPayment, debt.currency) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>

        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">{debt.name}</p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Saldo restante: {formatCurrency(debt.currentBalance, debt.currency)}</span>
            <span>de {formatCurrency(debt.originalAmount, debt.currency)}</span>
          </div>
          <Progress value={pct} className="h-2" indicatorClassName="bg-red-500" />
          <p className="text-right text-xs text-gray-400">{pct.toFixed(1)}% pagado</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Importe del pago ({debt.currency})
          </label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            autoFocus
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleConfirm();
            }}
          />
          {minPaymentHint && (
            <p className="text-xs text-gray-400">Pago mínimo sugerido: {minPaymentHint}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {amountCents > 0 && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Saldo tras el pago:{' '}
            <span className="font-semibold text-gray-900">
              {formatCurrency(newBalance, debt.currency)}
            </span>
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pay.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={pay.isPending}>
            {pay.isPending ? 'Guardando...' : 'Confirmar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
