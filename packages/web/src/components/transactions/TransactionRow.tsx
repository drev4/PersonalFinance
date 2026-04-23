import { useState } from 'react';
import type React from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { TableRow, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { TransactionFormDialog } from './TransactionFormDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useDeleteTransaction } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { formatCurrency, formatDate, getTransactionTypeColor } from '../../lib/formatters';
import type { Transaction } from '../../types/api';
import { cn } from '../../lib/utils';

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTransaction = useDeleteTransaction();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const account = accounts?.find((a) => a._id === transaction.accountId);
  const category = categories?.find((c) => c._id === transaction.categoryId);

  const amountSign = transaction.type === 'expense' ? '-' : '+';
  const amountColor = getTransactionTypeColor(transaction.type);

  function handleDelete(): void {
    deleteTransaction.mutate(transaction._id, {
      onSuccess: () => setDeleteOpen(false),
    });
  }

  return (
    <>
      <TableRow>
        {/* Date */}
        <TableCell className="whitespace-nowrap text-gray-500">
          {formatDate(transaction.date, 'short')}
        </TableCell>

        {/* Description + tags */}
        <TableCell>
          <p className="font-medium text-gray-900">{transaction.description}</p>
          {transaction.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {transaction.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </TableCell>

        {/* Category */}
        <TableCell>
          {category ? (
            <Badge
              className="text-xs font-medium"
              style={{
                backgroundColor: `${category.color}20`,
                color: category.color,
                borderColor: 'transparent',
              }}
            >
              {category.name}
            </Badge>
          ) : (
            <span className="text-xs text-gray-400">Sin categoria</span>
          )}
        </TableCell>

        {/* Account */}
        <TableCell className="text-gray-600">
          {account?.name ?? <span className="text-gray-400">—</span>}
        </TableCell>

        {/* Amount */}
        <TableCell className="text-right">
          <span className={cn('text-sm font-semibold', amountColor)}>
            {amountSign}
            {formatCurrency(transaction.amount, transaction.currency)}
          </span>
        </TableCell>

        {/* Actions */}
        <TableCell className="text-right">
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Mas opciones"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-gray-200 bg-white shadow-lg"
                  role="menu"
                >
                  {transaction.type !== 'transfer' && transaction.type !== 'adjustment' && (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      {transaction.type !== 'transfer' && transaction.type !== 'adjustment' && (
        <TransactionFormDialog
          type={transaction.type as 'income' | 'expense'}
          transaction={transaction}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Eliminar transaccion"
        description={`Esta accion eliminara la transaccion "${transaction.description}" de forma permanente. No se puede deshacer.`}
        isLoading={deleteTransaction.isPending}
      />
    </>
  );
}
