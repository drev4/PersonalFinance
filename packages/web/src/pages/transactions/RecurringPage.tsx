import { useState, useEffect } from 'react';
import type React from 'react';
import { RepeatIcon, Pencil, Trash2, AlertCircle, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog';
import { useRecurring, useUpdateRecurring, useDeleteRecurring } from '../../hooks/useRecurring';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { formatCurrency, formatDate, getTransactionTypeColor } from '../../lib/formatters';
import type { RecurringTransaction, RecurringFrequency } from '../../api/recurring.api';
import { format, parseISO } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'día',
  weekly: 'semana',
  monthly: 'mes',
  yearly: 'año',
};

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

function frequencyLabel(frequency: RecurringFrequency, interval: number): string {
  if (interval === 1) {
    return { daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' }[frequency];
  }
  return `Cada ${interval} ${FREQUENCY_LABELS[frequency]}s`;
}

function toDateInputValue(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

interface EditFormState {
  frequency: RecurringFrequency;
  interval: string;
  nextDate: string;
  endDate: string;
}

interface EditDialogProps {
  open: boolean;
  tx: RecurringTransaction | null;
  onClose: () => void;
}

function EditDialog({ open, tx, onClose }: EditDialogProps): React.ReactElement {
  const updateMutation = useUpdateRecurring();
  const [apiError, setApiError] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>({
    frequency: 'monthly',
    interval: '1',
    nextDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (open && tx) {
      setApiError(null);
      setForm({
        frequency: tx.recurring.frequency,
        interval: String(tx.recurring.interval),
        nextDate: toDateInputValue(tx.recurring.nextDate),
        endDate: tx.recurring.endDate ? toDateInputValue(tx.recurring.endDate) : '',
      });
    }
  }, [open, tx]);

  const isValid =
    form.nextDate !== '' &&
    parseInt(form.interval, 10) >= 1;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!isValid || !tx || updateMutation.isPending) return;
    setApiError(null);

    updateMutation.mutate(
      {
        id: tx._id,
        data: {
          frequency: form.frequency,
          interval: parseInt(form.interval, 10),
          nextDate: new Date(form.nextDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        },
      },
      {
        onSuccess: onClose,
        onError: () => setApiError('No se pudo actualizar la recurrencia'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar recurrencia</DialogTitle>
        </DialogHeader>

        {tx && (
          <p className="text-sm text-gray-500 truncate">
            {tx.description} — <span className={getTransactionTypeColor(tx.type)}>{formatCurrency(tx.amount, tx.currency)}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Frequency */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Frecuencia
            </label>
            <Select
              value={form.frequency}
              onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as RecurringFrequency }))}
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          {/* Interval */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cada cuántos {FREQUENCY_LABELS[form.frequency]}s
            </label>
            <Input
              type="number"
              min={1}
              max={365}
              value={form.interval}
              onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}
            />
          </div>

          {/* Next date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Próxima fecha *
            </label>
            <Input
              type="date"
              value={form.nextDate}
              onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))}
              required
            />
          </div>

          {/* End date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Fecha de fin (opcional)
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="flex-1"
              />
              {form.endDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, endDate: '' }))}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>

          {apiError && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {apiError}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={!isValid || updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cancel confirm dialog ────────────────────────────────────────────────────

interface CancelDialogProps {
  open: boolean;
  tx: RecurringTransaction | null;
  onClose: () => void;
}

function CancelDialog({ open, tx, onClose }: CancelDialogProps): React.ReactElement {
  const deleteMutation = useDeleteRecurring();
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setApiError(null);
  }, [open]);

  function handleConfirm(): void {
    if (!tx) return;
    deleteMutation.mutate(tx._id, {
      onSuccess: onClose,
      onError: () => setApiError('No se pudo cancelar la recurrencia'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar recurrencia</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          ¿Seguro que quieres cancelar la recurrencia de <strong>{tx?.description}</strong>?
          La transacción existente no se eliminará.
        </p>
        {apiError && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {apiError}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Volver</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Cancelando...' : 'Cancelar recurrencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Recurring row ────────────────────────────────────────────────────────────

interface RecurringRowProps {
  tx: RecurringTransaction;
  accountName: string;
  categoryName: string;
  categoryColor: string;
  onEdit: (tx: RecurringTransaction) => void;
  onCancel: (tx: RecurringTransaction) => void;
}

function RecurringRow({
  tx,
  accountName,
  categoryName,
  categoryColor,
  onEdit,
  onCancel,
}: RecurringRowProps): React.ReactElement {
  const isExpired =
    tx.recurring.endDate != null && new Date(tx.recurring.endDate) < new Date();

  return (
    <div className="flex items-start gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      {/* Icon */}
      <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-50">
        <RepeatIcon className="h-5 w-5 text-primary-600" aria-hidden="true" />
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{tx.description}</span>
          {isExpired && (
            <Badge variant="warning" className="text-[10px]">Expirada</Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {/* Amount */}
          <span className={`font-semibold ${getTransactionTypeColor(tx.type)}`}>
            {formatCurrency(tx.amount, tx.currency)}
          </span>

          {/* Account */}
          <span>{accountName}</span>

          {/* Category */}
          {categoryName && (
            <Badge
              className="text-[11px] font-medium"
              style={{ backgroundColor: categoryColor + '20', color: categoryColor, borderColor: 'transparent' }}
            >
              {categoryName}
            </Badge>
          )}
        </div>

        {/* Frequency + dates */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <RepeatIcon className="h-3 w-3" aria-hidden="true" />
            {frequencyLabel(tx.recurring.frequency, tx.recurring.interval)}
          </span>
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            Próxima: <strong className="text-gray-700">{formatDate(tx.recurring.nextDate)}</strong>
          </span>
          {tx.recurring.endDate && (
            <span>
              Fin: {formatDate(tx.recurring.endDate)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(tx)}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Editar recurrencia"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onCancel(tx)}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Cancelar recurrencia"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecurringPage(): React.ReactElement {
  const { data: recurring, isLoading } = useRecurring();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const [editTx, setEditTx] = useState<RecurringTransaction | null>(null);
  const [cancelTx, setCancelTx] = useState<RecurringTransaction | null>(null);

  const accountMap = new Map((accounts ?? []).map((a) => [a._id, a]));
  const categoryMap = new Map((categories ?? []).map((c) => [c._id, c]));

  const active = (recurring ?? []).filter(
    (t) => !t.recurring.endDate || new Date(t.recurring.endDate) >= new Date(),
  );
  const expired = (recurring ?? []).filter(
    (t) => t.recurring.endDate != null && new Date(t.recurring.endDate) < new Date(),
  );

  function rowProps(tx: RecurringTransaction) {
    const account = accountMap.get(tx.accountId);
    const category = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
    return {
      accountName: account?.name ?? '—',
      categoryName: category?.name ?? '',
      categoryColor: category?.color ?? '#6b7280',
    };
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
          <RepeatIcon className="h-5 w-5 text-primary-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transacciones recurrentes</h1>
          <p className="text-sm text-gray-500">
            Plantillas que generan transacciones automáticamente.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (recurring ?? []).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <RepeatIcon className="h-10 w-10 text-gray-300" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-700">Sin transacciones recurrentes</p>
              <p className="mt-1 text-sm text-gray-400">
                Crea una transacción y activa la recurrencia para que aparezca aquí.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active */}
      {!isLoading && active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Activas ({active.length})
          </p>
          {active.map((tx) => (
            <RecurringRow
              key={tx._id}
              tx={tx}
              {...rowProps(tx)}
              onEdit={setEditTx}
              onCancel={setCancelTx}
            />
          ))}
        </div>
      )}

      {/* Expired */}
      {!isLoading && expired.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Expiradas ({expired.length})
          </p>
          {expired.map((tx) => (
            <RecurringRow
              key={tx._id}
              tx={tx}
              {...rowProps(tx)}
              onEdit={setEditTx}
              onCancel={setCancelTx}
            />
          ))}
        </div>
      )}

      <EditDialog
        open={editTx !== null}
        tx={editTx}
        onClose={() => setEditTx(null)}
      />
      <CancelDialog
        open={cancelTx !== null}
        tx={cancelTx}
        onClose={() => setCancelTx(null)}
      />
    </div>
  );
}
