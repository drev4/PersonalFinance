import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, RepeatIcon, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useUpcomingRecurring } from '../../hooks/useDashboard';
import { formatCurrency } from '../../lib/formatters';
import type { Transaction } from '../../types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function txDateKey(tx: Transaction): string | null {
  return tx.recurring?.nextDate ? format(parseISO(tx.recurring.nextDate), 'yyyy-MM-dd') : null;
}

function txColor(type: string): string {
  if (type === 'income') return '#00C896';
  if (type === 'expense') return '#FF4757';
  return '#8B5CF6';
}

function txBgColor(type: string): string {
  if (type === 'income') return '#E6FBF5';
  if (type === 'expense') return '#FFF0F1';
  return '#F3F0FF';
}

// ─── Day chip ─────────────────────────────────────────────────────────────────

interface DayChipProps {
  tx: Transaction;
}

function DayChip({ tx }: DayChipProps): React.ReactElement {
  return (
    <div
      className="truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight"
      style={{ color: txColor(tx.type), backgroundColor: txBgColor(tx.type) }}
      title={`${tx.description} — ${formatCurrency(tx.amount, tx.currency)}`}
    >
      {tx.description}
    </div>
  );
}

// ─── Day detail panel ─────────────────────────────────────────────────────────

interface DayDetailProps {
  day: Date;
  transactions: Transaction[];
  accountMap: Map<string, string>;
  categoryMap: Map<string, { name: string; color: string }>;
  onClose: () => void;
}

function DayDetail({
  day,
  transactions,
  accountMap,
  categoryMap,
  onClose,
}: DayDetailProps): React.ReactElement {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-md">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {format(day, 'EEEE', { locale: es })}
          </p>
          <p className="text-sm font-bold text-gray-900">
            {format(day, "d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar detalle"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-gray-50 overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">Sin pagos programados</p>
        ) : (
          transactions.map((tx) => {
            const category = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
            return (
              <div key={tx._id} className="flex items-start gap-3 px-4 py-3">
                <div
                  className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: txBgColor(tx.type) }}
                >
                  <RepeatIcon className="h-3.5 w-3.5" style={{ color: txColor(tx.type) }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{tx.description}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                    <span>{accountMap.get(tx.accountId) ?? '—'}</span>
                    {category && (
                      <Badge
                        className="text-[10px] font-medium"
                        style={{
                          backgroundColor: category.color + '20',
                          color: category.color,
                          borderColor: 'transparent',
                        }}
                      >
                        {category.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <span
                  className="flex-shrink-0 text-sm font-bold"
                  style={{ color: txColor(tx.type) }}
                >
                  {tx.type === 'expense' ? '−' : '+'}
                  {formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {transactions.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          {(() => {
            const cur = transactions[0]?.currency ?? 'EUR';
            return (
              <>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Total gastos</span>
                  <span className="font-semibold text-red-500">
                    {formatCurrency(
                      transactions
                        .filter((t) => t.type === 'expense')
                        .reduce((s, t) => s + t.amount, 0),
                      cur,
                    )}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>Total ingresos</span>
                  <span className="font-semibold text-emerald-500">
                    {formatCurrency(
                      transactions
                        .filter((t) => t.type === 'income')
                        .reduce((s, t) => s + t.amount, 0),
                      cur,
                    )}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

interface CalendarGridProps {
  displayMonth: Date;
  txByDate: Map<string, Transaction[]>;
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
}

function CalendarGrid({
  displayMonth,
  txByDate,
  selectedDay,
  onSelectDay,
}: CalendarGridProps): React.ReactElement {
  const days = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [displayMonth]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const txs = txByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, displayMonth);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isCurrent = isToday(day);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={[
                'relative flex min-h-[88px] flex-col gap-0.5 border-b border-r border-gray-50 p-1.5 text-left transition-colors last-of-type:border-r-0',
                inMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50',
                isSelected ? 'ring-2 ring-inset ring-primary-500' : '',
                isPast && inMonth ? 'opacity-60' : '',
              ].join(' ')}
            >
              {/* Day number */}
              <span
                className={[
                  'inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isCurrent
                    ? 'bg-primary-600 text-white'
                    : inMonth
                    ? 'text-gray-800'
                    : 'text-gray-300',
                ].join(' ')}
              >
                {format(day, 'd')}
              </span>

              {/* Transaction chips — show first 2, then "+N" */}
              <div className="flex flex-col gap-0.5">
                {txs.slice(0, 2).map((tx) => (
                  <DayChip key={tx._id} tx={tx} />
                ))}
                {txs.length > 2 && (
                  <span className="text-[10px] font-semibold text-gray-400">
                    +{txs.length - 2} más
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage(): React.ReactElement {
  const today = useMemo(() => new Date(), []);
  const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  // Compute days needed to reach end of displayed month
  const days = useMemo(() => {
    const end = endOfMonth(displayMonth);
    const diff = differenceInCalendarDays(end, today);
    return Math.max(31, Math.min(365, diff + 2));
  }, [displayMonth, today]);

  const { data: upcoming, isLoading } = useUpcomingRecurring(days);

  const txByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of upcoming ?? []) {
      const key = txDateKey(tx);
      if (!key) continue;
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, tx]);
    }
    return map;
  }, [upcoming]);

  const accountMap = useMemo(
    () => new Map((accounts ?? []).map((a) => [a._id, a.name])),
    [accounts],
  );

  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c._id, { name: c.name, color: c.color }])),
    [categories],
  );

  const selectedTxs = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return txByDate.get(key) ?? [];
  }, [selectedDay, txByDate]);

  function prevMonth() {
    setDisplayMonth((m) => subMonths(m, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setDisplayMonth((m) => addMonths(m, 1));
    setSelectedDay(null);
  }

  // Summary for current month
  const monthSummary = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    let expenses = 0;
    let income = 0;
    for (const tx of upcoming ?? []) {
      const key = txDateKey(tx);
      if (!key) continue;
      const d = parseISO(key);
      if (d < monthStart || d > monthEnd) continue;
      if (tx.type === 'expense') expenses += tx.amount;
      else if (tx.type === 'income') income += tx.amount;
    }
    return { expenses, income, currency: (upcoming ?? [])[0]?.currency ?? 'EUR' };
  }, [upcoming, displayMonth]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <CalendarDays className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Calendario de recurrentes</h1>
            <p className="text-sm text-gray-500">Pagos e ingresos programados por día</p>
          </div>
        </div>
        <Link
          to="/transactions/recurring"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          ← Ver lista
        </Link>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold capitalize text-gray-900">
            {format(displayMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          {!isLoading && (
            <p className="text-xs text-gray-400">
              <span className="text-red-500 font-semibold">
                {formatCurrency(monthSummary.expenses, monthSummary.currency)}
              </span>{' '}
              gastos ·{' '}
              <span className="text-emerald-500 font-semibold">
                {formatCurrency(monthSummary.income, monthSummary.currency)}
              </span>{' '}
              ingresos
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Main content */}
      <div className={selectedDay ? 'grid gap-6 lg:grid-cols-[1fr_280px]' : ''}>
        {/* Calendar */}
        {isLoading ? (
          <Skeleton className="h-[500px] w-full rounded-xl" />
        ) : (
          <CalendarGrid
            displayMonth={displayMonth}
            txByDate={txByDate}
            selectedDay={selectedDay}
            onSelectDay={(day) =>
              setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
            }
          />
        )}

        {/* Day detail */}
        {selectedDay && (
          <DayDetail
            day={selectedDay}
            transactions={selectedTxs}
            accountMap={accountMap}
            categoryMap={categoryMap}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          Gasto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Ingreso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
          Transferencia
        </span>
      </div>
    </div>
  );
}
