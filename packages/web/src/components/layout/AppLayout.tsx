import {
  ArrowLeftRight,
  BarChart2,
  Calculator,
  CreditCard,
  FileBarChart,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plug,
  Search,
  Tag,
  Target,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLogout, useMe } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from '../notifications/NotificationBell';
import { CommandPalette } from '../search/CommandPalette';
import { Button } from '../ui/button';
import { LanguageSelector } from '../ui/language-selector';

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
  {
    to: '/settings/categories',
    icon: <FolderTree className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Categorías',
  },
  {
    to: '/settings/category-rules',
    icon: <Tag className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
    label: 'Reglas',
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  useMe(); // Sincroniza baseCurrency, locale y otros cambios de perfil hechos desde mobile

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
          {/* Left: hamburger (mobile) + logo (mobile) */}
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-4 rounded p-1.5 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
              aria-label="Abrir menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
                <TrendingUp className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-base font-semibold text-gray-900">Finanzas</span>
            </div>
          </div>

          {/* Center/Right: search trigger + notification bell */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={openPalette}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Buscar (⌘K)"
            >
              <Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                ⌘K
              </kbd>
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto" role="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
