import { Search, Bell } from 'lucide-react';
import type React from 'react';
import type { ReactNode } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onSearch?: () => void;
}

export function TopBar({ title, subtitle, action, onSearch }: TopBarProps): React.ReactElement {
  return (
    <div
      className="flex items-end justify-between gap-4 flex-wrap"
      style={{
        padding: '32px 40px 24px',
        borderBottom: '0.5px solid var(--hairline)',
      }}
    >
      <div className="min-w-0 flex-1">
        {subtitle && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{subtitle}</div>
        )}
        <h1
          style={{
            fontSize: 'clamp(20px, 2.4vw, 28px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            margin: 0,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onSearch}
          className="web-search-pill flex items-center gap-2.5"
          style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline)',
            borderRadius: 12,
            padding: '8px 12px',
            width: 'clamp(180px, 22vw, 280px)',
            cursor: 'text',
            color: 'var(--text-3)',
            fontSize: 13,
          }}
        >
          <Search size={15} />
          <span style={{ flex: 1, textAlign: 'left' }}>Buscar…</span>
          <kbd
            style={{
              fontSize: 10,
              color: 'var(--text-3)',
              background: 'var(--surface-3)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            ⌘K
          </kbd>
        </button>
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--surface)',
            border: '0.5px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <Bell size={16} />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
        </button>
        {action}
      </div>
    </div>
  );
}
