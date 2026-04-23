import { useState } from 'react';
import type React from 'react';
import { Plus, Upload, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from '../../components/ui/table';
import PortfolioSummaryCard from '../../components/holdings/PortfolioSummaryCard';
import HoldingRow from '../../components/holdings/HoldingRow';
import HoldingFormDialog from '../../components/holdings/HoldingFormDialog';
import ImportCsvDialog from '../../components/holdings/ImportCsvDialog';
import { useHoldings, usePortfolioSummary, useDeleteHolding } from '../../hooks/useHoldings';
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
          <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
          <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded" /></td>
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
  const emptyMsg = EMPTY_STATE_MESSAGES[activeTab] ?? EMPTY_STATE_MESSAGES.all;

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
              <HoldingRow
                key={holding._id}
                holding={holding}
                onEdit={onEdit}
                onDelete={onDelete}
              />
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HoldingsPage(): React.ReactElement {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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

  // Filter holdings by active tab
  const filteredHoldings =
    activeTab === 'all'
      ? holdings
      : holdings.filter((h) => h.assetType === activeTab);

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
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────────────────── */}
      <HoldingFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editing={editingHolding}
      />

      <ImportCsvDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}
