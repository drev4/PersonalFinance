import { useState, useEffect } from 'react';
import type React from 'react';
import { useDepositGoal } from '../../hooks/useGoals';
import { formatCurrency } from '../../lib/formatters';
import type { Goal } from '../../types/api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';

interface GoalDepositDialogProps {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalDepositDialog({
  goal,
  open,
  onOpenChange,
}: GoalDepositDialogProps): React.ReactElement {
  const deposit = useDepositGoal();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRaw('');
      setError('');
    }
  }, [open]);

  const amountCents = Math.round(parseFloat(raw.replace(',', '.')) * 100) || 0;
  const previewCurrent = goal.currentAmount + amountCents;
  const pct = goal.targetAmount > 0 ? Math.min(100, (previewCurrent / goal.targetAmount) * 100) : 0;

  async function handleConfirm(): Promise<void> {
    if (amountCents <= 0) {
      setError('Introduce un importe válido');
      return;
    }
    setError('');
    await deposit.mutateAsync({ id: goal._id, amount: amountCents });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Aportar a meta</DialogTitle>
        </DialogHeader>

        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">{goal.name}</p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{formatCurrency(goal.currentAmount, 'EUR')}</span>
            <span>de {formatCurrency(goal.targetAmount, 'EUR')}</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-right text-xs text-gray-400">{pct.toFixed(1)}% conseguido</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Importe a aportar (€)</label>
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
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deposit.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={deposit.isPending}>
            {deposit.isPending ? 'Guardando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
