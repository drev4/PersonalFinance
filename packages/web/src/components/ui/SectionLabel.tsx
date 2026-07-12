import type React from 'react';
import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
}

export function SectionLabel({
  children,
  action,
  onAction,
}: SectionLabelProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-1 mb-3">
      <span
        style={{
          color: 'var(--text-3)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>
      {action && (
        <button
          onClick={onAction}
          style={{
            color: 'var(--accent)',
            fontSize: 13,
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
