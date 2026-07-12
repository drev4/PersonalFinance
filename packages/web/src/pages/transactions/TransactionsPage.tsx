import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  X,
  Repeat,
  Tag,
  Receipt,
  RefreshCw,
  Flag,
  Share2,
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { TransactionFormDialog } from '../../components/transactions/TransactionFormDialog';
import { TransactionRow } from '../../components/transactions/TransactionRow';
import { TransferFormDialog } from '../../components/transactions/TransferFormDialog';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/button';
import { CatChip } from '../../components/ui/CatChip';
import { EmptyState } from '../../components/ui/empty-state';
import { Input } from '../../components/ui/input';
import { Pill } from '../../components/ui/Pill';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import { TopBar } from '../../components/ui/TopBar';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions, useTransactionTags } from '../../hooks/useTransactions';
import { formatDate } from '../../lib/formatters';
import type { Transaction, Category, Account } from '../../types/api';

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton(): React.ReactElement {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="mb-1 h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="ml-auto h-6 w-6 rounded" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface TxDetailPanelProps {
  tx: Transaction;
  categories: Category[];
  accounts: Account[];
}

function TxDetailPanel({ tx, categories, accounts }: TxDetailPanelProps): React.ReactElement {
  const cat = categories.find((c) => c._id === tx.categoryId);
  const account = accounts.find((a) => a._id === tx.accountId);
  const isIncome = tx.type === 'income';

  const typeLabel =
    tx.type === 'income'
      ? 'Ingreso'
      : tx.type === 'expense'
        ? 'Gasto'
        : tx.type === 'transfer'
          ? 'Transferencia'
          : 'Ajuste';

  return (
    <div className="animate-slide-in-right">
      {/* Header centrado */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <CatChip
          icon={cat ? <span style={{ fontSize: 18 }}>{cat.icon}</span> : <Receipt size={18} />}
          color={cat?.color ? `${cat.color}25` : 'var(--surface-3)'}
          fg={cat?.color ?? 'var(--text-2)'}
          size={56}
        />
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12 }}>{tx.description}</div>
        <div style={{ marginTop: 8 }}>
          <Amount
            value={tx.amount}
            size={36}
            sign
            color={isIncome ? 'var(--accent)' : 'var(--text)'}
          />
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 6 }}>
          <Pill>{typeLabel}</Pill>
        </div>
      </div>

      {/* Ficha de datos */}
      <div
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--hairline)',
          borderRadius: 16,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'Categoría', value: cat?.name ?? '—' },
          { label: 'Fecha', value: formatDate(tx.date) },
          { label: 'Cuenta', value: account?.name ?? tx.accountId },
          { label: 'Referencia', value: tx._id.slice(-8).toUpperCase() },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: i < arr.length - 1 ? '0.5px solid var(--hairline)' : 'none',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Acciones 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { icon: <Receipt size={16} />, label: 'Recibo' },
          { icon: <RefreshCw size={16} />, label: 'Repetir' },
          { icon: <Flag size={16} />, label: 'Marcar' },
          { icon: <Share2 size={16} />, label: 'Compartir' },
        ].map(({ icon, label }) => (
          <button
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: 12,
              background: 'var(--surface)',
              border: '0.5px solid var(--hairline)',
              borderRadius: 12,
              color: 'var(--text-2)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyDetailPanel(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-4)',
        gap: 8,
      }}
    >
      <Receipt size={32} style={{ opacity: 0.3 }} />
      <span style={{ fontSize: 13 }}>Selecciona una transacción</span>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const today = new Date();
const DEFAULT_FROM = format(startOfMonth(today), 'yyyy-MM-dd');
const DEFAULT_TO = format(endOfMonth(today), 'yyyy-MM-dd');

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage(): React.ReactElement {
  const [searchParams] = useSearchParams();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filter state
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [accountId, setAccountId] = useState(searchParams.get('accountId') ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: availableTags = [] } = useTransactionTags();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [from, to, accountId, categoryId, type, selectedTags]);

  const filters = {
    from,
    to,
    ...(accountId && { accountId }),
    ...(categoryId && { categoryId }),
    ...(type && { type: type as 'income' | 'expense' | 'transfer' | 'adjustment' }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(selectedTags.length > 0 && { tags: selectedTags }),
    page,
    limit: 20,
  };

  const { data, isLoading } = useTransactions(filters);
  const transactions = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const handleClearFilters = useCallback(() => {
    setFrom(DEFAULT_FROM);
    setTo(DEFAULT_TO);
    setAccountId('');
    setCategoryId('');
    setType('');
    setSearch('');
    setSelectedTags([]);
    setPage(1);
  }, []);

  const hasActiveFilters =
    from !== DEFAULT_FROM ||
    to !== DEFAULT_TO ||
    accountId !== '' ||
    categoryId !== '' ||
    type !== '' ||
    search !== '' ||
    selectedTags.length > 0;

  const filteredTagOptions = availableTags.filter((t) =>
    t.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  // Sync type filter from segmented control
  function handleSetType(val: string): void {
    setType(val);
    setPage(1);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Movimientos"
        subtitle="Todas las cuentas"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpenseOpen(true)}
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Gasto
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIncomeOpen(true)}
              className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ingreso
            </Button>
            <Button size="sm" onClick={() => setTransferOpen(true)} className="gap-1.5">
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              Transferencia
            </Button>
            <Button size="sm" variant="outline" asChild className="gap-1.5">
              <Link to="/transactions/recurring">
                <Repeat className="h-4 w-4" aria-hidden="true" />
                Recurrentes
              </Link>
            </Button>
          </div>
        }
      />

      <div className="web-tx-grid" style={{ flex: 1, minHeight: 0 }}>
        {/* ── Left: list ── */}
        <div style={{ padding: '20px 32px 40px', overflow: 'auto' }}>
          {/* Segmented control + filter/export buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                background: 'var(--surface)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 10,
                padding: 3,
              }}
            >
              {[
                { id: '', label: 'Todo' },
                { id: 'income', label: 'Entradas' },
                { id: 'expense', label: 'Salidas' },
              ].map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleSetType(o.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    background: type === o.id ? 'var(--surface-3)' : 'transparent',
                    color: type === o.id ? 'var(--text)' : 'var(--text-3)',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'background 150ms',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  background: hasActiveFilters ? 'rgba(196,255,61,0.10)' : 'var(--surface)',
                  border: `0.5px solid ${hasActiveFilters ? 'var(--accent)' : 'var(--hairline)'}`,
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  color: hasActiveFilters ? 'var(--accent)' : 'var(--text-3)',
                  cursor: 'pointer',
                }}
              >
                <SlidersHorizontal size={13} />
                Filtros
                {hasActiveFilters && (
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#0A0A0A',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    !
                  </span>
                )}
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  background: 'var(--surface)',
                  border: '0.5px solid var(--hairline)',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                }}
              >
                <Download size={13} />
                Exportar
              </button>
            </div>
          </div>

          {/* Advanced filters panel */}
          {filtersOpen && (
            <div
              style={{
                background: 'var(--surface)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 16,
                padding: '16px',
                marginBottom: 16,
              }}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                    Desde
                  </label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                    Hasta
                  </label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                    Cuenta
                  </label>
                  <Select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="h-9 text-sm"
                  >
                    <option value="">Todas las cuentas</option>
                    {accounts?.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                    Categoría
                  </label>
                  <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-9 text-sm"
                  >
                    <option value="">Todas las categorías</option>
                    {categories
                      ?.filter((c) => c.isActive)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                    Buscar
                  </label>
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Descripción, notas..."
                    className="h-9 text-sm"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                    Etiquetas
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      onClick={() => {
                        setTagsOpen((v) => !v);
                        setTagSearch('');
                      }}
                    >
                      <Tag className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                      {selectedTags.length === 0 ? (
                        <span className="text-gray-400">Todas las etiquetas</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {selectedTags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-0.5 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700"
                            >
                              {t}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTags((prev) => prev.filter((x) => x !== t));
                                }}
                                aria-label={`Quitar ${t}`}
                              >
                                <X className="h-3 w-3" aria-hidden="true" />
                              </button>
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                    {tagsOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setTagsOpen(false)}
                          aria-hidden="true"
                        />
                        <div className="absolute left-0 top-10 z-20 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
                          <div className="p-2">
                            <Input
                              type="text"
                              placeholder="Buscar etiqueta..."
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                              className="h-7 text-xs"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {filteredTagOptions.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-gray-400">Sin etiquetas</p>
                            ) : (
                              filteredTagOptions.map((tag) => {
                                const active = selectedTags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${active ? 'font-medium text-primary-700' : 'text-gray-700'}`}
                                    onClick={() => {
                                      setSelectedTags((prev) =>
                                        active ? prev.filter((t) => t !== tag) : [...prev, tag],
                                      );
                                    }}
                                  >
                                    <span
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${active ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}
                                    >
                                      {active && (
                                        <span className="text-white text-xs leading-none">✓</span>
                                      )}
                                    </span>
                                    {tag}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="gap-1.5 text-gray-500"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div
            style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--hairline)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {['Fecha', 'Descripción', 'Categoría', 'Cuenta', 'Importe', ''].map((h) => (
                    <TableHead
                      key={h}
                      style={{
                        padding: '12px 16px',
                        fontSize: 11,
                        color: 'var(--text-3)',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                      className={h === 'Importe' ? 'text-right' : h === '' ? 'w-10' : ''}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-0">
                      <EmptyState
                        title="No hay transacciones"
                        description="No se encontraron transacciones con los filtros actuales."
                        className="border-0 rounded-none"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TransactionRow
                      key={tx._id}
                      transaction={tx}
                      isSelected={selectedTx?._id === tx._id}
                      onSelect={() => setSelectedTx(tx)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                {meta && <> · {meta.total} registros</>}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: detail panel ── */}
        <aside
          style={{
            borderLeft: '0.5px solid var(--hairline)',
            overflow: 'auto',
            padding: 24,
            background: 'rgba(20,20,20,0.4)',
          }}
        >
          {selectedTx ? (
            <TxDetailPanel tx={selectedTx} categories={categories} accounts={accounts} />
          ) : (
            <EmptyDetailPanel />
          )}
        </aside>
      </div>

      {/* Dialogs */}
      <TransactionFormDialog type="income" open={incomeOpen} onOpenChange={setIncomeOpen} />
      <TransactionFormDialog type="expense" open={expenseOpen} onOpenChange={setExpenseOpen} />
      <TransferFormDialog open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
