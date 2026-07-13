/**
 * Formats an amount in cents to a human-readable currency string.
 * Backend stores amounts as integers (cents). We divide by 100 before displaying.
 */
export function formatCurrency(
  amountInCents: number,
  currency: string = 'EUR',
  locale = 'es-ES',
): string {
  const amount = amountInCents / 100;
  const currencyCode = currency && currency.length === 3 ? currency.toUpperCase() : 'EUR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(
  dateStr: string,
  formatType: 'short' | 'long' | 'relative' = 'short',
): string {
  const date = new Date(dateStr);

  switch (formatType) {
    case 'long':
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'short':
    default:
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
  }
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
