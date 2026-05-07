import {
  CreditCard,
  Home,
  Car,
  GraduationCap,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { useDeleteDebt } from '../../hooks/useDebts';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { Debt, DebtType } from '../../types/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DebtFormDialog } from './DebtFormDialog';
import { DebtPaymentDialog } from './DebtPaymentDialog';

const TYPE_LABELS: Record<DebtType, string> = {
  credit_card: 'Tarjeta de crédito',
  personal_loan: 'Préstamo personal',
  mortgage: 'Hipoteca',
  student_loan: 'Préstamo estudiantil',
  car_loan: 'Préstamo coche',
  other: 'Otro',
};

const TYPE_ICONS: Record<DebtType, React.ElementType> = {
  credit_card: CreditCard,
  personal_loan: User,
  mortgage: Home,
  student_loan: GraduationCap,
  car_loan: Car,
  other: TrendingDown,
};

interface DebtCardProps {
  debt: Debt;
}

export function DebtCard({ debt }: DebtCardProps): React.ReactElement {
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const deleteDebt = useDeleteDebt();

  const color = debt.color ?? '#ef4444';
  const IconComponent = TYPE_ICONS[debt.type];

  const pct =
    debt.originalAmount > 0
      ? Math.min(100, ((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100)
      : 0;

  const info = debt.info;

  function handleDelete(): void {
    if (window.confirm(`¿Eliminar la deuda "${debt.name}"?`)) {
      void deleteDebt.mutateAsync(debt._id);
    }
    setMenuOpen(false);
  }

  return (
    <>
      <Card className="relative flex flex-col transition-shadow hover:shadow-md">
        {/* Kebab menu */}
        <div className="absolute right-3 top-3 z-10">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Mas opciones"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setEditOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={handleDelete}
                    disabled={deleteDebt.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <CardContent className="pt-5 flex flex-col gap-4">
          {/* Icon + Name + type */}
          <div className="flex items-center gap-3 pr-8">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}20` }}
              aria-hidden="true"
            >
              <IconComponent className="h-5 w-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900">{debt.name}</h3>
              <p className="text-xs text-gray-500">{TYPE_LABELS[debt.type]}</p>
              {debt.isPaidOff && (
                <Badge variant="success" className="gap-1 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Pagada
                </Badge>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Pagado: {pct.toFixed(1)}%</span>
              <span style={{ color }}>
                {formatCurrency(debt.currentBalance, debt.currency)} restante
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>Deuda original: {formatCurrency(debt.originalAmount, debt.currency)}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Interés anual</p>
              <p className="text-sm font-semibold text-gray-900">{debt.interestRate.toFixed(2)}%</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Pago mínimo</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(debt.minimumPayment, debt.currency)}/mes
              </p>
            </div>
          </div>

          {/* Payoff info */}
          {info && !debt.isPaidOff && (
            <div
              className={cn(
                'rounded-lg p-3 space-y-1',
                info.monthsToPayoff === null ? 'bg-red-50' : 'bg-blue-50',
              )}
            >
              {info.monthsToPayoff !== null ? (
                <>
                  <p className="text-xs font-medium text-blue-800">
                    Liquidación estimada en{' '}
                    <span className="font-bold">
                      {info.monthsToPayoff < 12
                        ? `${info.monthsToPayoff} mes${info.monthsToPayoff !== 1 ? 'es' : ''}`
                        : `${(info.monthsToPayoff / 12).toFixed(1)} años`}
                    </span>
                  </p>
                  {info.totalInterestEstimate !== null && info.totalInterestEstimate > 0 && (
                    <p className="text-xs text-blue-600">
                      Intereses totales estimados:{' '}
                      {formatCurrency(info.totalInterestEstimate, debt.currency)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs font-medium text-red-700">
                  El pago mínimo no cubre los intereses. La deuda crece cada mes.
                </p>
              )}
            </div>
          )}

          {/* Next payment date */}
          {debt.nextPaymentDate && !debt.isPaidOff && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              Próximo pago: {formatDate(debt.nextPaymentDate)}
            </div>
          )}

          {/* Pay button */}
          {!debt.isPaidOff && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayOpen(true)}
              className="w-full"
              style={{ borderColor: `${color}60`, color }}
            >
              Registrar pago
            </Button>
          )}
        </CardContent>
      </Card>

      <DebtPaymentDialog debt={debt} open={payOpen} onOpenChange={setPayOpen} />
      <DebtFormDialog debt={debt} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
