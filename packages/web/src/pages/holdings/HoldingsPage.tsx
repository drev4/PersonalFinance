import { Coins, Plus, TrendingUp, Upload } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import HoldingFormDialog from '../../components/holdings/HoldingFormDialog';
import HoldingRow from '../../components/holdings/HoldingRow';
import ImportCsvDialog from '../../components/holdings/ImportCsvDialog';
import PortfolioSummaryCard from '../../components/holdings/PortfolioSummaryCard';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { EmptyState } from '../../components/ui/empty-state';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  useAddDividend,
  useDeleteHolding,
  useHoldings,
  usePortfolioSummary,
} from '../../hooks/useHoldings';
import { formatCurrency } from '../../lib/formatters';
import type { HoldingWithValue, AssetType } from '../../types/api';

// ─── Tab configuration ────────────────────────────────────────────────────────

interface TabConfig {
  value: string;
  label: string;
  filter: AssetType | null;
}

const TABS: TabConfig[] = [
  { value: 'all', label: 'Todas', filter: null },
  { value: 'crypto', label: 'Cripto', filter: 'crypto' },
  { value: 'stock', label: 'Acciones', filter: 'stock' },
  { value: 'etf', label: 'ETFs', filter: 'etf' },
  { value: 'bond', label: 'Bonos', filter: 'bond' },
];

const EMPTY_STATE_MESSAGES: Record<string, { title: string; description: string }> = {
  all: {
    title: 'No tienes posiciones todavia',
    description:
      'Anade tu primera posicion manualmente o importa desde un broker CSV para empezar a ver tu portfolio.',
  },
  crypto: {
    title: 'Sin criptomonedas',
    description: 'Anade tus posiciones de Bitcoin, Ethereum u otras criptos.',
  },
  stock: {
    title: 'Sin acciones',
    description: 'Anade tus posiciones en bolsa: Apple, Tesla, Inditex...',
  },
  etf: {
    title: 'Sin ETFs',
    description: 'Anade tus fondos cotizados como Vanguard MSCI World o iShares.',
  },
  bond: {
    title: 'Sin bonos',
    description: 'Anade tus posiciones de renta fija o deuda publica.',
  },
};

// ─── Table skeleton rows ──────────────────────────────────────────────────────

function TableSkeletonRows(): React.ReactElement {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <TableRow key={i}>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-14 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-4 py-3">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-10" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-7 w-7 rounded" />
          </td>
        </TableRow>
      ))}
    </>
  );
}

// ─── Holdings table ───────────────────────────────────────────────────────────

interface HoldingsTableProps {
  holdings: HoldingWithValue[];
  isLoading: boolean;
  activeTab: string;
  onEdit: (holding: HoldingWithValue) => void;
  onDelete: (holding: HoldingWithValue) => void;
  onAdd: () => void;
}

function HoldingsTable({
  holdings,
  isLoading,
  activeTab,
  onEdit,
  onDelete,
  onAdd,
}: HoldingsTableProps): React.ReactElement {
  const emptyMsg = EMPTY_STATE_MESSAGES[activeTab] ?? EMPTY_STATE_MESSAGES.all!;

  if (!isLoading && holdings.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-8 w-8" aria-hidden="true" />}
        title={emptyMsg.title}
        description={emptyMsg.description}
        action={{
          label: '+ Anadir posicion',
          onClick: onAdd,
        }}
      />
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Precio actual</TableHead>
            <TableHead>Valor total</TableHead>
            <TableHead>P&amp;L</TableHead>
            <TableHead>% Cartera</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows />
          ) : (
            holdings.map((holding) => (
              <HoldingRow key={holding._id} holding={holding} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

interface DeleteConfirmProps {
  holding: HoldingWithValue;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function DeleteConfirmBanner({
  holding,
  onConfirm,
  onCancel,
  isPending,
}: DeleteConfirmProps): React.ReactElement {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3"
      role="alert"
    >
      <p className="text-sm text-red-700">
        Eliminar posicion <strong>{holding.symbol}</strong>. Esta accion no se puede deshacer.
      </p>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          className="bg-red-600 text-white hover:bg-red-700"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </div>
    </div>
  );
}

// ─── Add income dialog ────────────────────────────────────────────────────────

interface AddIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdings: HoldingWithValue[];
}

function AddIncomeDialog({
  open,
  onOpenChange,
  holdings,
}: AddIncomeDialogProps): React.ReactElement {
  const addDividend = useAddDividend();
  const [holdingId, setHoldingId] = useState('');
  const [type, setType] = useState<'dividend' | 'staking'>('dividend');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleClose(): void {
    onOpenChange(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!holdingId || isNaN(amountCents) || amountCents <= 0 || !date) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    try {
      await addDividend.mutateAsync({
        holdingId,
        data: {
          type,
          amount: amountCents,
          currency: currency.toUpperCase(),
          date,
          notes: notes.trim() || undefined,
        },
      });
      handleClose();
      setAmount('');
      setNotes('');
    } catch {
      setError('No se pudo guardar el ingreso. Intenta de nuevo.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir ingreso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
          {/* Holding */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Posición *</label>
            <select
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <option value="">Selecciona una posición</option>
              {holdings.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.symbol} — {h.currency}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <div className="flex gap-3">
              {(['dividend', 'staking'] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="incomeType"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="accent-primary-600"
                  />
                  {t === 'dividend' ? 'Dividendo' : 'Staking'}
                </label>
              ))}
            </div>
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Importe *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="w-24 space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Divisa</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                className="uppercase"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Fecha *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              maxLength={200}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addDividend.isPending}>
              {addDividend.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HoldingsPage(): React.ReactElement {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<HoldingWithValue | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<HoldingWithValue | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings();
  const { data: portfolioSummary, isLoading: portfolioLoading } = usePortfolioSummary();
  const deleteMutation = useDeleteHolding();

  function handleOpenCreate(): void {
    setEditingHolding(null);
    setFormDialogOpen(true);
  }

  function handleOpenEdit(holding: HoldingWithValue): void {
    setEditingHolding(holding);
    setFormDialogOpen(true);
  }

  function handleRequestDelete(holding: HoldingWithValue): void {
    setDeletingHolding(holding);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deletingHolding) return;
    await deleteMutation.mutateAsync(deletingHolding._id);
    setDeletingHolding(null);
  }

  // Derive currency from first holding (fallback EUR)
  const currency = holdings[0]?.currency ?? 'EUR';

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis inversiones</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Seguimiento de tu portfolio de inversiones
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Importar CSV
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Anadir posicion
            </Button>
          </div>
        </div>

        {/* ─── Portfolio summary card ───────────────────────────────────── */}
        <PortfolioSummaryCard
          data={portfolioSummary}
          isLoading={portfolioLoading}
          currency={currency}
        />

        {/* ─── Delete confirmation banner ───────────────────────────────── */}
        {deletingHolding && (
          <DeleteConfirmBanner
            holding={deletingHolding}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeletingHolding(null)}
            isPending={deleteMutation.isPending}
          />
        )}

        {/* ─── Tabs + table ─────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TABS.map((tab) => {
              const count =
                tab.filter === null
                  ? holdings.length
                  : holdings.filter((h) => h.assetType === tab.filter).length;

              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <HoldingsTable
                holdings={
                  tab.filter === null
                    ? holdings
                    : holdings.filter((h) => h.assetType === tab.filter)
                }
                isLoading={holdingsLoading}
                activeTab={tab.value}
                onEdit={handleOpenEdit}
                onDelete={handleRequestDelete}
                onAdd={handleOpenCreate}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* ─── Ingresos section ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" aria-hidden="true" />
                <CardTitle className="text-base font-semibold text-gray-600">
                  Ingresos este año
                </CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIncomeDialogOpen(true)}
                disabled={holdings.length === 0}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Añadir ingreso
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {portfolioLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-600 tabular-nums">
                  {formatCurrency(portfolioSummary?.totalDividendsYtd ?? 0, currency)}
                </span>
                <span className="text-sm text-gray-400">dividendos y staking acumulados</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────────────────── */}
      <HoldingFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editing={editingHolding}
      />

      <ImportCsvDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      <AddIncomeDialog
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
        holdings={holdings}
      />
    </div>
  );
}
