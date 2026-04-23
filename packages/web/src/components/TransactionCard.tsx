import type { Transaction } from '@finanzas/shared';
import { formatCurrency, formatDate } from '../lib/formatters';

interface TransactionCardProps {
  transaction: Transaction;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const formatted = formatCurrency(transaction.amount, transaction.currency);

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
      <div>
        <h3 className="font-semibold text-gray-900">{transaction.description}</h3>
        <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
      </div>
      <div
        className={`text-lg font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}
      >
        {sign}{formatted}
      </div>
    </div>
  );
};
