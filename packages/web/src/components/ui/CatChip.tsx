import type React from 'react';
import type { ReactNode } from 'react';

interface CatChipProps {
  icon: ReactNode;
  color?: string;
  fg?: string;
  size?: number;
}

export function CatChip({
  icon,
  color = 'var(--surface-3)',
  fg = 'var(--text-2)',
  size = 40,
}: CatChipProps): React.ReactElement {
  const radius = size / 2.6;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: color,
        color: fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    >
      {icon}
    </div>
  );
}
