import { useState } from 'react';
import type React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  TrendingUp,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  PiggyBank,
  Calculator,
  Target,
  BarChart2,
  FileBarChart,
  Plug,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useLogout, useMe } from '../../hooks/useAuth';
import { usePrefetchAccounts, usePrefetchTransactions } from '../../hooks/usePrefetch';
import { Button } from '../ui/button';
import { LanguageSelector } from '../ui/language-selector';
import { NotificationBell } from '../notifications/NotificationBell';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Dashboard',
  },
  {
    to: '/accounts',
    icon: <CreditCard className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Cuentas',
  },
  {
    to: '/transactions',
    icon: <ArrowLeftRight className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Transacciones',
  },
  {
    to: '/budgets',
    icon: <PiggyBank className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Presupuestos',
  },
  {
    to: '/goals',
    icon: <Target className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Metas',
  },
  {
    to: '/holdings',
    icon: <BarChart2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Inversiones',
  },
  {
    to: '/simulators',
    icon: <Calculator className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Simuladores',
  },
  {
    to: '/reports',
    icon: <FileBarChart className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Reportes',
  },
];

const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    to: '/settings/integrations',
    icon: <Plug className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Integraciones',
  },
  {
    to: '/settings/profile',
    icon: <User className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Perfil',
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function Sidebar({ open, onClose }: SidebarProps): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();

  const displayName = user?.name || user?.email || 'Usuario';

  function handleLogout(): void {
    logoutMutation.mutate();
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white shadow-lg transition-transform duration-300',
        'lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      aria-label="Navegacion principal"
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <TrendingUp className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold text-gray-900">Finanzas</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Cerrar menu"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu de navegacion">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.disabled) {
              return (
                <div
                  key={item.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed select-none"
                  title="Proximamente"
                  aria-disabled="true"
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="ml-auto text-xs bg-gray-100 text-gray-400 rounded px-1.5 py-0.5">
                    Pronto
                  </span>
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Settings section */}
        <div className="mt-6">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Configuracion
          </p>
          <div className="space-y-1">
            {SETTINGS_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <span className="text-sm font-semibold" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <NotificationBell />
        </div>
        <div className="mb-2 flex justify-end">
          <LanguageSelector />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {logoutMutation.isPending ? 'Cerrando sesion...' : 'Cerrar sesion'}
        </Button>
      </div>
    </aside>
  );
}

export default function AppLayout(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useMe(); // Sincroniza baseCurrency, locale y otros cambios de perfil hechos desde mobile

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-4 rounded p-1.5 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Abrir menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
                <TrendingUp className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-base font-semibold text-gray-900">Finanzas</span>
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto" role="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
