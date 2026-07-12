import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type React from 'react';
import type { CashflowMonth } from '../../types/api';

export function monthLabel(monthStr: string): string {
  // monthStr = "2026-01"
  const [year, month] = monthStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return format(d, 'MMM', { locale: es }).replace('.', '');
}

interface SixMonthBarChartProps {
  cashflow: CashflowMonth[];
}

export function SixMonthBarChart({ cashflow }: SixMonthBarChartProps): React.ReactElement {
  const maxVal =
    cashflow.length > 0 ? Math.max(...cashflow.map((m) => Math.max(m.income, m.expenses)), 1) : 1;
  const maxH = 180;

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-3)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'inline-block',
            }}
          />
          Ingresos
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-3)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--text-3)',
              display: 'inline-block',
            }}
          />
          Gastos
        </span>
      </div>
      {/* Bars */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: maxH + 24 }}>
        {cashflow.map((m, i) => {
          const isLast = i === cashflow.length - 1;
          const inH = Math.max(4, Math.round((m.income / maxVal) * maxH));
          const outH = Math.max(4, Math.round((m.expenses / maxVal) * maxH));
          return (
            <div
              key={m.month}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: maxH }}>
                <div
                  style={{
                    width: 18,
                    height: inH,
                    borderRadius: 4,
                    background: isLast ? 'var(--accent)' : 'rgba(196,255,61,0.45)',
                  }}
                />
                <div
                  style={{
                    width: 18,
                    height: outH,
                    borderRadius: 4,
                    background: isLast ? 'var(--text-2)' : 'var(--surface-3)',
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'capitalize' }}>
                {monthLabel(m.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
