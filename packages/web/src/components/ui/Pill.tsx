import type React from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PillProps {
  children: ReactNode;
  color?: string;
  fg?: string;
  className?: string;
}

export function Pill({ children, color, fg, className }: PillProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium leading-none',
        className,
      )}
      style={{
        background: color ?? 'var(--surface-3)',
        color: fg ?? 'var(--text-2)',
      }}
    >
      {children}
    </span>
  );
}
