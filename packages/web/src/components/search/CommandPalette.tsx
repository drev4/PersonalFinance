import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  BarChart2,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Search,
  Target,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions } from '../../api/transactions.api';
import { useAccounts } from '../../hooks/useAccounts';
import { useHoldings } from '../../hooks/useHoldings';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { Account, HoldingWithValue, Transaction } from '../../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultGroup = 'nav' | 'transaction' | 'account' | 'holding';

interface ResultItem {
  id: string;
  group: ResultGroup;
  label: string;
  sublabel?: string;
  meta?: string;
  metaColor?: string;
  icon: React.ReactNode;
  href: string;
}

// ─── Quick nav ────────────────────────────────────────────────────────────────

const QUICK_NAV: ResultItem[] = [
  {
    id: 'nav-dashboard',
    group: 'nav',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
    href: '/dashboard',
  },
  {
    id: 'nav-transactions',
    group: 'nav',
    label: 'Transacciones',
    icon: <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />,
    href: '/transactions',
  },
  {
    id: 'nav-accounts',
    group: 'nav',
    label: 'Cuentas',
    icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
    href: '/accounts',
  },
  {
    id: 'nav-budgets',
    group: 'nav',
    label: 'Presupuestos',
    icon: <PiggyBank className="h-4 w-4" aria-hidden="true" />,
    href: '/budgets',
  },
  {
    id: 'nav-goals',
    group: 'nav',
    label: 'Metas',
    icon: <Target className="h-4 w-4" aria-hidden="true" />,
    href: '/goals',
  },
  {
    id: 'nav-holdings',
    group: 'nav',
    label: 'Inversiones',
    icon: <BarChart2 className="h-4 w-4" aria-hidden="true" />,
    href: '/holdings',
  },
];

const GROUP_LABELS: Record<ResultGroup, string> = {
  nav: 'Navegación rápida',
  transaction: 'Transacciones',
  account: 'Cuentas',
  holding: 'Inversiones',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txToResult(tx: Transaction): ResultItem {
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
  const color = tx.type === 'income' ? '#00C896' : tx.type === 'expense' ? '#FF4757' : '#8B5CF6';
  return {
    id: tx._id,
    group: 'transaction',
    label: tx.description,
    sublabel: formatDate(tx.date, 'short'),
    meta: `${sign}${formatCurrency(tx.amount, tx.currency)}`,
    metaColor: color,
    icon: <ArrowLeftRight className="h-4 w-4 text-gray-400" aria-hidden="true" />,
    href: '/transactions',
  };
}

function accountToResult(acc: Account): ResultItem {
  return {
    id: acc._id,
    group: 'account',
    label: acc.name,
    sublabel: acc.institution ?? acc.type,
    meta: formatCurrency(acc.currentBalance, acc.currency),
    icon: <CreditCard className="h-4 w-4 text-gray-400" aria-hidden="true" />,
    href: '/accounts',
  };
}

function holdingToResult(h: HoldingWithValue): ResultItem {
  const sign = h.pnl >= 0 ? '+' : '';
  return {
    id: h._id,
    group: 'holding',
    label: h.symbol,
    sublabel: h.assetType.toUpperCase(),
    meta: `${sign}${h.pnlPercentage.toFixed(2)}%`,
    metaColor: h.pnl >= 0 ? '#00C896' : '#FF4757',
    icon: <BarChart2 className="h-4 w-4 text-gray-400" aria-hidden="true" />,
    href: '/holdings',
  };
}

// ─── Result row ───────────────────────────────────────────────────────────────

interface ResultRowProps {
  item: ResultItem;
  active: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}

function ResultRow({ item, active, onSelect, onMouseEnter }: ResultRowProps): React.ReactElement {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        active ? 'bg-primary-50' : 'hover:bg-gray-50',
      )}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
    >
      <span
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
        )}
      >
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{item.label}</p>
        {item.sublabel && <p className="truncate text-xs text-gray-400">{item.sublabel}</p>}
      </div>
      {item.meta && (
        <span
          className="flex-shrink-0 text-xs font-semibold"
          style={{ color: item.metaColor ?? '#6B7280' }}
        >
          {item.meta}
        </span>
      )}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps): React.ReactElement | null {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Debounce input → query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(rawQuery.trim()), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rawQuery]);

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setRawQuery('');
      setDebouncedQuery('');
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const hasQuery = debouncedQuery.length >= 2;

  // Transaction search (API)
  const { data: txData, isFetching: txLoading } = useQuery({
    queryKey: ['cmd-search-transactions', debouncedQuery],
    queryFn: () => getTransactions({ search: debouncedQuery, limit: 5 }),
    enabled: hasQuery,
    staleTime: 1000 * 30,
  });

  // Accounts + holdings (client-side filter)
  const { data: accounts } = useAccounts();
  const { data: holdings } = useHoldings();

  const allResults = useMemo<ResultItem[]>(() => {
    if (!hasQuery) return QUICK_NAV;

    const q = debouncedQuery.toLowerCase();

    const txResults = (txData?.data ?? []).map(txToResult);

    const accResults = (accounts ?? [])
      .filter(
        (a) => a.name.toLowerCase().includes(q) || (a.institution ?? '').toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map(accountToResult);

    const holdingResults = (holdings ?? [])
      .filter((h) => h.symbol.toLowerCase().includes(q) || h.assetType.toLowerCase().includes(q))
      .slice(0, 4)
      .map(holdingToResult);

    return [...txResults, ...accResults, ...holdingResults];
  }, [hasQuery, debouncedQuery, txData, accounts, holdings]);

  // Keep active item scrolled into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Reset active index on results change
  useEffect(() => {
    setActiveIndex(0);
  }, [allResults]);

  const handleSelect = useCallback(
    (item: ResultItem) => {
      navigate(item.href);
      onClose();
    },
    [navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = allResults[activeIndex];
        if (item) handleSelect(item);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [allResults, activeIndex, handleSelect, onClose],
  );

  if (!open) return null;

  // Build grouped display
  const groups: ResultGroup[] = [];
  const seenGroups = new Set<ResultGroup>();
  for (const item of allResults) {
    if (!seenGroups.has(item.group)) {
      seenGroups.add(item.group);
      groups.push(item.group);
    }
  }

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda global"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl mx-4 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar transacciones, cuentas, inversiones..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Buscar"
            aria-autocomplete="list"
            aria-controls="cmd-results"
            aria-activedescendant={
              allResults[activeIndex] ? `cmd-item-${allResults[activeIndex].id}` : undefined
            }
          />
          {rawQuery && (
            <button
              type="button"
              onClick={() => setRawQuery('')}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={scrollRef}
          id="cmd-results"
          role="listbox"
          aria-label="Resultados"
          className="max-h-[380px] overflow-y-auto px-2 py-2"
        >
          {hasQuery && txLoading && (
            <p className="py-6 text-center text-xs text-gray-400">Buscando...</p>
          )}

          {!txLoading && allResults.length === 0 && hasQuery && (
            <p className="py-6 text-center text-xs text-gray-400">
              Sin resultados para &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {!txLoading &&
            groups.map((group) => {
              const groupItems = allResults.filter((r) => r.group === group);
              return (
                <div key={group} className="mb-1">
                  <p className="mb-1 mt-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {GROUP_LABELS[group]}
                  </p>
                  {groupItems.map((item) => {
                    const itemIndex = flatIndex++;
                    const isActive = itemIndex === activeIndex;
                    return (
                      <div
                        key={item.id}
                        id={`cmd-item-${item.id}`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <ResultRow
                          item={item}
                          active={isActive}
                          onSelect={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">
              ↑↓
            </kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">↵</kbd>
            abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">
              Esc
            </kbd>
            cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
