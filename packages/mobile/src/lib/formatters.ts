/**
 * Formatting utilities for currency, dates and percentages.
 *
 * These are duplicated here temporarily until @finanzas/shared exposes them.
 * Once shared/lib/formatters is published, replace these imports.
 */

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a numeric amount as a locale-aware currency string.
 * Falls back to the raw currency code when the locale does not recognise it.
 *
 * @example formatCurrency(45230.5, 'EUR') // "€ 45.230,50"
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code — show raw code + amount
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ─── Percentage ───────────────────────────────────────────────────────────────

/**
 * Format a decimal as a percentage string.
 *
 * @example formatPercent(2.345) // "2.35%"
 * @example formatPercent(-0.5) // "-0.50%"
 */
export function formatPercent(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/**
 * Format a date as a human-readable Spanish string.
 * Returns "Hoy", "Ayer" or "14 de abril" depending on recency.
 *
 * @example formatDate(new Date()) // "Hoy"
 * @example formatDate(yesterday) // "Ayer"
 * @example formatDate(someDate)  // "14 de abril"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return 'Hoy';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'Ayer';

  const month = MONTHS_ES[d.getMonth()];
  return `${d.getDate()} de ${month ?? d.toLocaleDateString('es-ES', { month: 'long' })}`;
}
