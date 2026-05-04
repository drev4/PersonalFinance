import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  X,
  Repeat,
  Tag,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import { TransactionRow } from '../../components/transactions/TransactionRow';
import { TransactionFormDialog } from '../../components/transactions/TransactionFormDialog';
import { TransferFormDialog } from '../../components/transactions/TransferFormDialog';
import { useTransactions, useTransactionTags } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { format, startOfMonth, endOfMonth } from 'date-fns';

function TableSkeleton(): React.ReactElement {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell>
            <Skeleton className="mb-1 h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell className="text-right"><Skeleton className="ml-auto h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="ml-auto h-6 w-6 rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

const today = new Date();
const DEFAULT_FROM = format(startOfMonth(today), 'yyyy-MM-dd');
const DEFAULT_TO = format(endOfMonth(today), 'yyyy-MM-dd');

export default function TransactionsPage(): React.ReactElement {
  const [searchParams] = useSearchParams();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Filters state
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

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
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

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
            <p className="mt-1 text-sm text-gray-500">
              {meta ? `${meta.total} transacciones encontradas` : 'Historial de movimientos'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
            <Button
              size="sm"
              onClick={() => setTransferOpen(true)}
              className="gap-1.5"
            >
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
        </div>

        {/* Filters panel */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span className="flex items-center gap-2">
              Filtros
              {hasActiveFilters && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                  !
                </span>
              )}
            </span>
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
          </button>

          {filtersOpen && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Date from */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Desde</label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Date to */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Hasta</label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Account */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Cuenta</label>
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

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Categoria</label>
                  <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-9 text-sm"
                  >
                    <option value="">Todas las categorias</option>
                    {categories?.filter((c) => c.isActive).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Type */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Tipo</label>
                  <Select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-9 text-sm"
                  >
                    <option value="">Todos los tipos</option>
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                    <option value="transfer">Transferencia</option>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Buscar</label>
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Descripcion, notas..."
                    className="h-9 text-sm"
                  />
                </div>

                {/* Tags multi-select */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-medium text-gray-600">Etiquetas</label>
                  <div className="relative">
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      onClick={() => { setTagsOpen((v) => !v); setTagSearch(''); }}
                    >
                      <Tag className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                      {selectedTags.length === 0 ? (
                        <span className="text-gray-400">Todas las etiquetas</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {selectedTags.map((t) => (
                            <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                              {t}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedTags((prev) => prev.filter((x) => x !== t)); }}
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
                        <div className="fixed inset-0 z-10" onClick={() => setTagsOpen(false)} aria-hidden="true" />
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
                                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${active ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                                      {active && <span className="text-white text-xs leading-none">✓</span>}
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
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="w-10" />
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
                      description="No se encontraron transacciones con los filtros actuales. Prueba a cambiar el rango de fechas o crea una nueva."
                      className="border-0 rounded-none"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TransactionRow key={tx._id} transaction={tx} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Pagina <span className="font-medium">{page}</span> de{' '}
              <span className="font-medium">{totalPages}</span>
              {meta && (
                <> &middot; {meta.total} registros</>
              )}
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

      {/* Dialogs */}
      <TransactionFormDialog
        type="income"
        open={incomeOpen}
        onOpenChange={setIncomeOpen}
      />
      <TransactionFormDialog
        type="expense"
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
      />
      <TransferFormDialog open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
