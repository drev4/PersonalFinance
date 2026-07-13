import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeftRight } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SixMonthBarChart } from '../components/dashboard/SixMonthBarChart';
import { TransferFormDialog } from '../components/transactions/TransferFormDialog';
import { Amount } from '../components/ui/Amount';
import { Pill } from '../components/ui/Pill';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Skeleton } from '../components/ui/skeleton';
import { TopBar } from '../components/ui/TopBar';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import {
  useNetWorthSummary,
  useDashboardCashflow,
  useUpcomingRecurring,
} from '../hooks/useDashboard';
import { useGoals } from '../hooks/useGoals';
import { useTransactions } from '../hooks/useTransactions';
import { formatDate } from '../lib/formatters';
import { useAuthStore } from '../stores/authStore';
import type { CashflowMonth } from '../types/api';

// ─── Mini bar chart ───────────────────────────────────────────────────────────

interface MiniBarChartProps {
  cashflow: CashflowMonth[];
}

function MiniBarChart({ cashflow }: MiniBarChartProps): React.ReactElement {
  const maxVal =
    cashflow.length > 0 ? Math.max(...cashflow.map((m) => Math.max(m.income, m.expenses)), 1) : 1;
  const chartH = 32;

  if (cashflow.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: chartH }}>
        {[28, 20, 35, 18, 30, 25, 22].map((h, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: h,
              background: 'var(--surface-3)',
              borderRadius: 2,
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: chartH }}>
      {cashflow.map((m, i) => {
        const h = Math.max(4, Math.round((m.expenses / maxVal) * chartH));
        const isLast = i === cashflow.length - 1;
        return (
          <div
            key={m.month}
            style={{
              width: 8,
              height: h,
              background: isLast ? 'var(--accent)' : 'rgba(196,255,61,0.30)',
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Transaction skeleton ─────────────────────────────────────────────────────

function TxSkeleton(): React.ReactElement {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: '0.5px solid var(--hairline)',
          }}
        >
          <Skeleton className="h-8 w-8 rounded-xl" />
          <div style={{ flex: 1 }}>
            <Skeleton className="h-3.5 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage(): React.ReactElement {
  const [transferOpen, setTransferOpen] = useState(false);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0]?.trim() ?? user?.email ?? 'Usuario';

  const todaySubtitle = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  const capitalised = todaySubtitle.charAt(0).toUpperCase() + todaySubtitle.slice(1);

  const { data: netWorth } = useNetWorthSummary();
  const { data: cashflow = [] } = useDashboardCashflow(6);
  const { data: txData } = useTransactions({ page: 1, limit: 6 });
  const { data: accounts = [] } = useAccounts();
  const { data: goals = [] } = useGoals();
  const { data: upcoming = [] } = useUpcomingRecurring(30);
  const { data: categories = [] } = useCategories();

  const transactions = txData?.data ?? [];
  const isLoadingTx = !txData;

  const lastCashflow = cashflow[cashflow.length - 1];
  const monthlyDelta = lastCashflow ? lastCashflow.income - lastCashflow.expenses : 0;
  const activeAccounts = accounts.filter((a) => a.isActive);
  const activeGoals = goals.filter((g) => g.isActive && !g.isCompleted).slice(0, 3);

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <TopBar
        title={`Buenos días, ${firstName}`}
        subtitle={capitalised}
        action={
          <button
            onClick={() => setTransferOpen(true)}
            style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--hairline)',
              borderRadius: 12,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <ArrowLeftRight size={15} />
            Nueva transferencia
          </button>
        }
      />

      <div style={{ padding: '28px 40px 60px', overflow: 'auto', flex: 1 }}>
        <div className="web-grid-21">
          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. Hero card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #141414 0%, #0a0a0a 100%)',
                borderRadius: 24,
                padding: 28,
                border: '0.5px solid var(--hairline)',
              }}
            >
              <div style={{ fontSize: 13, color: 'rgba(245,245,245,0.55)', marginBottom: 8 }}>
                Saldo total
              </div>
              <Amount value={netWorth?.total ?? 0} size={56} color="#F5F5F5" />
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 16,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <Pill
                    color={monthlyDelta >= 0 ? 'rgba(196,255,61,0.15)' : 'rgba(255,107,107,0.15)'}
                    fg={monthlyDelta >= 0 ? 'var(--accent)' : 'var(--negative)'}
                  >
                    {monthlyDelta >= 0 ? '+' : ''}
                    {(monthlyDelta / 100).toFixed(0)} € este mes
                  </Pill>
                  <Pill color="rgba(255,255,255,0.08)" fg="rgba(245,245,245,0.7)">
                    {activeAccounts.length} {activeAccounts.length === 1 ? 'cuenta' : 'cuentas'}
                  </Pill>
                </div>
                <MiniBarChart cashflow={cashflow} />
              </div>
            </div>

            {/* 2. KPI strip */}
            <div className="web-grid-3" style={{ gap: 12 }}>
              {[
                { label: 'Ingresos · mes', value: lastCashflow?.income ?? 0, accent: true },
                { label: 'Gastos · mes', value: lastCashflow?.expenses ?? 0, accent: false },
                {
                  label: 'Ahorrado',
                  value: lastCashflow?.net ?? 0,
                  accent: (lastCashflow?.net ?? 0) > 0,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  style={{
                    background: 'var(--surface)',
                    border: '0.5px solid var(--hairline)',
                    borderRadius: 16,
                    padding: '16px 18px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {kpi.label}
                  </div>
                  <Amount
                    value={kpi.value}
                    size={22}
                    color={kpi.accent ? 'var(--accent)' : 'var(--text)'}
                  />
                </div>
              ))}
            </div>

            {/* 3. 6-month chart */}
            <div
              style={{
                background: 'var(--surface)',
                border: '0.5px solid var(--hairline)',
                borderRadius: 24,
                padding: 24,
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  Últimos 6 meses
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  Ingresos vs. gastos
                </div>
              </div>
              <SixMonthBarChart cashflow={cashflow} />
            </div>

            {/* 4. Recent transactions */}
            <div>
              <SectionLabel action="Ver todo" onAction={() => navigate('/transactions')}>
                Movimientos recientes
              </SectionLabel>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '0.5px solid var(--hairline)',
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                {isLoadingTx ? (
                  <TxSkeleton />
                ) : transactions.length === 0 ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: 'var(--text-4)',
                      fontSize: 13,
                    }}
                  >
                    Sin movimientos recientes
                  </div>
                ) : (
                  <>
                    {/* Header row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto',
                        gap: 8,
                        padding: '10px 16px',
                        borderBottom: '0.5px solid var(--hairline)',
                      }}
                    >
                      {['Comercio', 'Categoría', 'Fecha', 'Importe'].map((h) => (
                        <span
                          key={h}
                          style={{
                            fontSize: 11,
                            color: 'var(--text-3)',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.4,
                          }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                    {transactions.map((tx, idx) => {
                      const cat = categories.find((c) => c._id === tx.categoryId);
                      const isIncome = tx.type === 'income';
                      return (
                        <div
                          key={tx._id}
                          onClick={() => navigate('/transactions')}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto auto',
                            gap: 8,
                            padding: '12px 16px',
                            borderBottom:
                              idx < transactions.length - 1
                                ? '0.5px solid var(--hairline)'
                                : 'none',
                            cursor: 'pointer',
                            transition: 'background 120ms',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background =
                              'var(--surface-2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = '';
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {tx.description}
                          </span>
                          {cat ? (
                            <Pill color={`${cat.color}20`} fg={cat.color}>
                              {cat.name}
                            </Pill>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>
                          )}
                          <span
                            style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                          >
                            {formatDate(tx.date)}
                          </span>
                          <Amount
                            value={tx.amount}
                            size={14}
                            sign
                            color={isIncome ? 'var(--accent)' : 'var(--text)'}
                          />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 5. Accounts */}
            <div>
              <SectionLabel>Cuentas</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeAccounts.map((account) => (
                  <div
                    key={account._id}
                    style={{
                      background: 'var(--surface)',
                      border: '0.5px solid var(--hairline)',
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-3)',
                        marginBottom: 4,
                        textTransform: 'capitalize',
                      }}
                    >
                      {account.type}
                    </div>
                    <div style={{ fontSize: 14, marginBottom: 6, color: 'var(--text)' }}>
                      {account.name}
                    </div>
                    <Amount
                      value={account.currentBalance}
                      size={20}
                      color={account.currentBalance < 0 ? 'var(--negative)' : 'var(--text)'}
                    />
                  </div>
                ))}
                {activeAccounts.length === 0 && (
                  <div style={{ color: 'var(--text-4)', fontSize: 13, padding: '12px 0' }}>
                    Sin cuentas activas
                  </div>
                )}
              </div>
            </div>

            {/* 6. Goals */}
            {goals.length > 0 && (
              <div>
                <SectionLabel action="Ver todas" onAction={() => navigate('/goals')}>
                  Metas
                </SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeGoals.map((goal) => {
                    const pct =
                      goal.targetAmount > 0
                        ? Math.min(1, goal.currentAmount / goal.targetAmount)
                        : 0;
                    return (
                      <div
                        key={goal._id}
                        style={{
                          background: 'var(--surface)',
                          border: '0.5px solid var(--hairline)',
                          borderRadius: 16,
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          {goal.icon && (
                            <span
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 10,
                                background: goal.color ? `${goal.color}25` : 'var(--surface-3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                            >
                              {goal.icon}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text)',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {goal.name}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {Math.round(pct * 100)}%
                          </span>
                        </div>
                        <div
                          style={{
                            background: 'var(--surface-3)',
                            borderRadius: 4,
                            height: 5,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${pct * 100}%`,
                              background: goal.color ?? 'var(--accent)',
                              borderRadius: 4,
                              transition: 'width 600ms ease',
                            }}
                          />
                        </div>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}
                        >
                          <Amount value={goal.currentAmount} size={12} color="var(--text-3)" />
                          <Amount value={goal.targetAmount} size={12} color="var(--text-4)" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7. Upcoming charges */}
            {upcoming.length > 0 && (
              <div>
                <SectionLabel>Próximos cargos</SectionLabel>
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '0.5px solid var(--hairline)',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                >
                  {upcoming.slice(0, 3).map((tx, idx) => (
                    <div
                      key={tx._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom:
                          idx < Math.min(upcoming.length, 3) - 1
                            ? '0.5px solid var(--hairline)'
                            : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                          {tx.description}
                        </div>
                        {tx.recurring?.nextDate && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            {formatDate(tx.recurring.nextDate)}
                          </div>
                        )}
                      </div>
                      <Amount value={tx.amount} size={14} color="var(--text-2)" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <TransferFormDialog open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
