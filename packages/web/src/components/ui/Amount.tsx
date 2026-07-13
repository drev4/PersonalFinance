import type React from 'react';
import { cn } from '../../lib/utils';

interface AmountProps {
  value: number; // in cents
  size?: number;
  sign?: boolean;
  color?: string;
  className?: string;
}

export function Amount({
  value,
  size = 32,
  sign = false,
  color,
  className,
}: AmountProps): React.ReactElement {
  const abs = Math.abs(value / 100);
  const int = Math.trunc(abs).toLocaleString('es-ES');
  const dec = (abs - Math.trunc(abs)).toFixed(2).slice(1); // ",XX"
  const prefix = sign ? (value > 0 ? '+' : value < 0 ? '−' : '') : '';

  return (
    <span
      className={cn(
        'font-mono tabular-nums inline-flex items-baseline leading-none tracking-tight',
        className,
      )}
      style={{
        fontSize: size,
        fontWeight: 500,
        letterSpacing: '-0.04em',
        color: color ?? 'var(--text)',
      }}
    >
      <span>
        {prefix}
        {int}
      </span>
      <span style={{ fontSize: size * 0.42, opacity: 0.55, marginLeft: 2 }}>{dec} €</span>
    </span>
  );
}
