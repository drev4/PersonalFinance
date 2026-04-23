import { useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrencyConverter } from '../../hooks/useCurrency';
import {
  MoreVertical,
  Pencil,
  SlidersHorizontal,
  Archive,
  Landmark,
  PiggyBank,
  Banknote,
  CreditCard,
  Home,
  Car,
  FileText,
  Building2,
  Bitcoin,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { AccountFormDialog } from './AccountFormDialog';
import { AdjustBalanceDialog } from './AdjustBalanceDialog';
import type { Account } from '../../types/api';
import { formatCurrency, getAccountTypeLabel } from '../../lib/formatters';
import { useArchiveAccount } from '../../hooks/useAccounts';

const ICON_MAP: Record<string, React.ElementType> = {
  Landmark,
  PiggyBank,
  Banknote,
  CreditCard,
  Home,
  Car,
  FileText,
  Building2,
  Bitcoin,
  TrendingUp,
  Wallet,
};

function AccountIcon({ iconName, color }: { iconName: string; color?: string }): React.ReactElement {
  const Icon = ICON_MAP[iconName] ?? Wallet;
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-lg"
      style={{ backgroundColor: color ? `${color}20` : '#3B82F620' }}
    >
      <Icon
        className="h-5 w-5"
        style={{ color: color ?? '#3B82F6' }}
        aria-hidden="true"
      />
    </div>
  );
}

interface AccountCardProps {
  account: Account;
}

const ICON_BY_TYPE: Record<string, string> = {
  checking: 'Landmark',
  savings: 'PiggyBank',
  cash: 'Banknote',
  credit_card: 'CreditCard',
  real_estate: 'Home',
  vehicle: 'Car',
  loan: 'FileText',
  mortgage: 'Building2',
  crypto: 'Bitcoin',
  investment: 'TrendingUp',
  other: 'Wallet',
};

export function AccountCard({ account }: AccountCardProps): React.ReactElement {
  const navigate = useNavigate();
  const archiveAccount = useArchiveAccount();
  const { convert, baseCurrency } = useCurrencyConverter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const iconName = ICON_BY_TYPE[account.type] ?? 'Wallet';
  const isLiability = ['loan', 'mortgage', 'credit_card'].includes(account.type);

  const showConversion =
    account.currency.toUpperCase() !== baseCurrency.toUpperCase();

  const convertedBalance = showConversion
    ? convert(account.currentBalance / 100, account.currency, baseCurrency)
    : null;

  function handleCardClick(e: React.MouseEvent): void {
    // Prevent navigation when clicking the menu
    if ((e.target as HTMLElement).closest('[data-menu]')) return;
    navigate(`/accounts/${account._id}`);
  }

  function handleArchive(e: React.MouseEvent): void {
    e.stopPropagation();
    setMenuOpen(false);
    if (confirm(`Archivar "${account.name}"? Seguira visible pero no activa.`)) {
      archiveAccount.mutate(account._id);
    }
  }

  return (
    <>
      <Card
        className="relative cursor-pointer p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        onClick={handleCardClick}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate(`/accounts/${account._id}`);
        }}
        role="button"
        aria-label={`Ver detalle de ${account.name}`}
      >
        {/* Header row */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AccountIcon iconName={iconName} color={account.color} />
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{account.name}</p>
              {account.institution && (
                <p className="text-xs text-gray-500">{account.institution}</p>
              )}
            </div>
          </div>

          {/* Kebab menu */}
          <div className="relative" data-menu>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Mas opciones"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>

            {menuOpen && (
              <>
                {/* Click-outside overlay */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 top-8 z-20 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      setAdjustOpen(true);
                    }}
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Ajustar saldo
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={handleArchive}
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Archivar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-0.5">Saldo actual</p>
          <p
            className={`text-xl font-bold ${
              isLiability ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {formatCurrency(account.currentBalance, account.currency)}
          </p>
          {showConversion && (
            <p className="text-xs text-gray-500 mt-1">
              {convertedBalance !== null
                ? `≈ ${convertedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${baseCurrency}`
                : 'Calculando conversión...'}
            </p>
          )}
        </div>

        {/* Badge */}
        <Badge variant="outline" className="text-xs">
          {getAccountTypeLabel(account.type)}
        </Badge>
      </Card>

      <AccountFormDialog account={account} open={editOpen} onOpenChange={setEditOpen} />
      <AdjustBalanceDialog account={account} open={adjustOpen} onOpenChange={setAdjustOpen} />
    </>
  );
}
