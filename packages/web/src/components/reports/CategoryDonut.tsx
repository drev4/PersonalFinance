import type React from 'react';
import { formatCurrency } from '../../lib/formatters';
import type { CategorySpendingItem } from '../../types/api';

interface CategoryDonutProps {
  items: CategorySpendingItem[];
  total: number;
  currency: string;
}

function buildConicGradient(items: CategorySpendingItem[]): string {
  if (items.length === 0) return 'var(--surface-3)';

  let cursor = 0;
  const stops = items.map((item) => {
    const start = cursor;
    cursor += item.percentage;
    return `${item.color} ${start}% ${cursor}%`;
  });
  if (cursor < 100) stops.push(`var(--surface-3) ${cursor}% 100%`);

  return `conic-gradient(${stops.join(', ')})`;
}

export function CategoryDonut({ items, total, currency }: CategoryDonutProps): React.ReactElement {
  const top5 = items.slice(0, 5);

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: buildConicGradient(top5),
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 26,
            borderRadius: '50%',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Total</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text)',
              fontFamily: 'Geist Mono, monospace',
            }}
          >
            {formatCurrency(total, currency)}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {top5.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Sin gastos categorizados este periodo.
          </span>
        )}
        {top5.map((item) => (
          <div key={item.categoryId}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              <span
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.color,
                    display: 'inline-block',
                  }}
                />
                {item.name}
              </span>
              <span style={{ color: 'var(--text-3)' }}>
                {formatCurrency(item.total, currency)} · {item.percentage.toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'var(--surface-3)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(item.percentage, 100)}%`,
                  background: item.color,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
