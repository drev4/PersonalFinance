import { useState } from 'react';
import type React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { AccountFormDialog } from '../../components/accounts/AccountFormDialog';
import { AdjustBalanceDialog } from '../../components/accounts/AdjustBalanceDialog';
import { useAccount } from '../../hooks/useAccounts';
import { useTransactions } from '../../hooks/useTransactions';
import { formatCurrency, formatDate, getAccountTypeLabel, getTransactionTypeColor } from '../../lib/formatters';

function AccountDetailSkeleton(): React.ReactElement {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </div>
  );
}

export default function AccountDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data: account, isLoading: accountLoading } = useAccount(id ?? '');
  const { data: transactionsData, isLoading: txLoading } = useTransactions({
    accountId: id,
    limit: 20,
    page: 1,
  });

  if (accountLoading) return <AccountDetailSkeleton />;

  if (!account) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="Cuenta no encontrada"
            description="La cuenta que buscas no existe o no tienes acceso."
            action={{ label: 'Volver a cuentas', onClick: () => navigate('/accounts') }}
          />
        </div>
      </div>
    );
  }

  const transactions = transactionsData?.data ?? [];
  const isLiability = ['loan', 'mortgage', 'credit_card'].includes(account.type);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/accounts')}
          className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a cuentas
        </button>

        {/* Account header card */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
                <Badge variant="outline">{getAccountTypeLabel(account.type)}</Badge>
              </div>
              {account.institution && (
                <p className="text-sm text-gray-500">{account.institution}</p>
              )}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-0.5">Saldo actual</p>
                <p
                  className={`text-3xl font-bold ${
                    isLiability ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {formatCurrency(account.currentBalance, account.currency)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjustOpen(true)}
                className="gap-1.5"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Ajustar saldo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar
              </Button>
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Ultimas transacciones</h2>
            <Link
              to={`/transactions?accountId=${account._id}`}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {txLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500">
                Esta cuenta no tiene transacciones aun.
              </p>
              <Link
                to="/transactions"
                className="mt-2 inline-block text-sm text-primary-600 hover:underline"
              >
                Crear transaccion
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.date, 'long')}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${getTransactionTypeColor(tx.type)}`}
                  >
                    {tx.type === 'expense' ? '-' : '+'}
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AccountFormDialog account={account} open={editOpen} onOpenChange={setEditOpen} />
      <AdjustBalanceDialog account={account} open={adjustOpen} onOpenChange={setAdjustOpen} />
    </div>
  );
}
