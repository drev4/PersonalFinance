import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AccountType, TransactionType } from '../types/api';

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Formats an amount in cents to a human-readable currency string.
 * Backend stores amounts as integers (cents). We divide by 100 before displaying.
 */
export function formatCurrency(
  amountInCents: number,
  currency: string,
  locale = 'es-ES',
): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Date ─────────────────────────────────────────────────────────────────────

export function formatDate(
  dateStr: string,
  formatType: 'short' | 'long' | 'relative' = 'short',
): string {
  const date = parseISO(dateStr);

  switch (formatType) {
    case 'long':
      return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
    case 'relative':
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    case 'short':
    default:
      return format(date, 'dd/MM/yyyy', { locale: es });
  }
}

// ─── Percentage ───────────────────────────────────────────────────────────────

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── Account type labels ──────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Cuenta corriente',
  savings: 'Ahorro',
  cash: 'Efectivo',
  credit_card: 'Tarjeta de credito',
  real_estate: 'Inmueble',
  vehicle: 'Vehiculo',
  loan: 'Prestamo',
  mortgage: 'Hipoteca',
  crypto: 'Cripto',
  investment: 'Inversion',
  other: 'Otro',
};

export function getAccountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type] ?? 'Desconocido';
}

// ─── Account type icons (Lucide icon names) ───────────────────────────────────

const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  checking: 'Landmark',
  savings: 'PiggyBank',
  cash: 'Banknote',
  credit_card: 'CreditCard',
  real_estate: 'Home',
  vehicle: 'Car',
  loan: 'FileText',
  mortgage: 'Building2',
  crypto: 'Bitcoin',
  investment: 'TrendingUp',
  other: 'Wallet',
};

export function getAccountTypeIcon(type: AccountType): string {
  return ACCOUNT_TYPE_ICONS[type] ?? 'Wallet';
}

// ─── Transaction type colors ──────────────────────────────────────────────────

const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  income: 'text-green-600',
  expense: 'text-red-600',
  transfer: 'text-blue-600',
  adjustment: 'text-yellow-600',
};

export function getTransactionTypeColor(type: TransactionType): string {
  return TRANSACTION_TYPE_COLORS[type] ?? 'text-gray-600';
}
