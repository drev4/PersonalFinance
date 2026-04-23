import type React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, parseISO, format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency } from '../../lib/formatters';
import { useUpcomingRecurring } from '../../hooks/useDashboard';
import type { Transaction } from '../../types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNextDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Manana';

    const distance = formatDistanceToNow(date, { addSuffix: false, locale: es });
    const formatted = format(date, "d MMM", { locale: es });

    // Show "en X dias" for near dates, otherwise "15 abr"
    const diffMs = date.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 14) {
      return `en ${distance}`;
    }
    return formatted;
  } catch {
    return dateStr;
  }
}

function getNextDate(tx: Transaction): string {
  return tx.recurring?.nextDate ?? tx.date;
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRow(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_ITEMS = 5;

export default function UpcomingRecurringWidget(): React.ReactElement {
  const { data, isLoading } = useUpcomingRecurring(30);

  // Sort by nextDate ascending, take first 5
  const sorted: Transaction[] = data
    ? [...data]
        .sort(
          (a, b) =>
            new Date(getNextDate(a)).getTime() - new Date(getNextDate(b)).getTime(),
        )
        .slice(0, MAX_ITEMS)
    : [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-600">
            Proximos pagos recurrentes
          </CardTitle>
          <CalendarClock className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Loading */}
        {isLoading && (
          <div className="divide-y divide-gray-100">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Empty */}
        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-400">No hay pagos proximos.</p>
          </div>
        )}

        {/* List */}
        {!isLoading && sorted.length > 0 && (
          <>
            <ul
              className="divide-y divide-gray-100"
              aria-label="Proximos pagos recurrentes"
            >
              {sorted.map((tx) => {
                const nextDate = getNextDate(tx);
                return (
                  <li
                    key={tx._id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    {/* Category icon placeholder */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"
                      aria-hidden="true"
                    >
                      <span className="text-xs font-bold">
                        {tx.description.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Description + date */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-400">{formatNextDate(nextDate)}</p>
                    </div>

                    {/* Amount */}
                    <span className="shrink-0 text-sm font-semibold text-red-600">
                      -{formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Footer link */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <Link
                to="/transactions?type=recurring"
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Ver todas
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
