import {
  BarChart2,
  CreditCard,
  Home,
  List,
  LogOut,
  Menu,
  Moon,
  Sun,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  X,
  Calculator,
  Plug,
  Bell,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { updateMe } from '../../api/auth.api';
import { useLogout, useMe } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { CommandPalette } from '../search/CommandPalette';
import { LanguageSelector } from '../ui/language-selector';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NAV_MAIN: NavItem[] = [
  { to: '/dashboard', icon: <Home size={18} aria-hidden="true" />, label: 'Inicio' },
  { to: '/transactions', icon: <List size={18} aria-hidden="true" />, label: 'Movimientos' },
  { to: '/reports', icon: <BarChart2 size={18} aria-hidden="true" />, label: 'Estadísticas' },
  { to: '/accounts', icon: <CreditCard size={18} aria-hidden="true" />, label: 'Cuentas' },
  { to: '/goals', icon: <Target size={18} aria-hidden="true" />, label: 'Metas' },
  { to: '/budgets', icon: <Tag size={18} aria-hidden="true" />, label: 'Categorías' },
  { to: '/settings/profile', icon: <User size={18} aria-hidden="true" />, label: 'Perfil' },
];

const NAV_TOOLS: NavItem[] = [
  { to: '/holdings', icon: <TrendingUp size={15} aria-hidden="true" />, label: 'Inversiones' },
  { to: '/simulators', icon: <Calculator size={15} aria-hidden="true" />, label: 'Simuladores' },
  { to: '/debts', icon: <TrendingDown size={15} aria-hidden="true" />, label: 'Deudas' },
  {
    to: '/settings/integrations',
    icon: <Plug size={15} aria-hidden="true" />,
    label: 'Integraciones',
  },
  { to: '/notifications', icon: <Bell size={15} aria-hidden="true" />, label: 'Notificaciones' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

function Sidebar({ open, onClose, theme, onThemeToggle }: SidebarProps): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();

  const displayName = user?.name || user?.email || 'Usuario';
  const initials = getInitials(displayName);

  function handleLogout(): void {
    logoutMutation.mutate();
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300',
        'lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
      style={{
        width: 260,
        background: 'var(--surface)',
        borderRight: '0.5px solid var(--hairline)',
        padding: '24px 16px',
      }}
      aria-label="Navegacion principal"
    >
      {/* Header: avatar + nombre + cierre mobile */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #C4FF3D, #94C42A)',
              color: '#0A0A0A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p
              className="truncate font-medium"
              style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}
            >
              {displayName}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.3 }}>Cuenta Premium</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--surface-2)',
            border: '0.5px solid var(--hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Cerrar menu"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto" aria-label="Menu de navegacion">
        <div className="space-y-0.5">
          {NAV_MAIN.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 transition-colors',
                  isActive ? 'nav-item-active' : 'nav-item-inactive',
                )
              }
              style={({ isActive }) => ({
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: isActive ? 'var(--surface-3)' : 'transparent',
                border: isActive ? '0.5px solid var(--hairline-strong)' : '0.5px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--text-2)',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    style={{
                      color: isActive ? 'var(--accent)' : 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Separador */}
        <div style={{ height: '0.5px', background: 'var(--hairline)', margin: '16px 4px' }} />

        {/* Herramientas */}
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-4)',
            padding: '0 4px 6px',
          }}
        >
          Herramientas
        </p>
        <div className="space-y-0.5">
          {NAV_TOOLS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              style={({ isActive }) => ({
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: isActive ? 'var(--surface-2)' : 'transparent',
                color: isActive ? 'var(--text-2)' : 'var(--text-3)',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom: theme toggle + idioma + logout */}
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '0.5px solid var(--hairline)' }}>
        <div className="flex items-center justify-between mb-3">
          <LanguageSelector />
          <button
            type="button"
            onClick={onThemeToggle}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '0.5px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
              cursor: 'pointer',
            }}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? (
              <Sun size={14} aria-hidden="true" />
            ) : (
              <Moon size={14} aria-hidden="true" />
            )}
          </button>
        </div>
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center gap-3 transition-colors"
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            background: 'transparent',
            border: '0.5px solid transparent',
            color: 'var(--negative)',
            cursor: logoutMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: logoutMutation.isPending ? 0.6 : 1,
          }}
        >
          <LogOut size={16} aria-hidden="true" />
          {logoutMutation.isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  useMe(); // Sincroniza baseCurrency, locale y otros cambios de perfil hechos desde mobile

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  function handleThemeToggle(): void {
    const newTheme: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    void updateMe({ preferences: { theme: newTheme } })
      .then((updated) => {
        if (accessToken) setAuth(updated, accessToken);
      })
      .catch(() => {});
  }

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
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header
          className="flex lg:hidden items-center justify-between px-4"
          style={{
            height: 56,
            background: 'var(--surface)',
            borderBottom: '0.5px solid var(--hairline)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '0.5px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
              cursor: 'pointer',
            }}
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
            }}
          >
            Finanzas
          </span>
          <button
            type="button"
            onClick={openPalette}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '0.5px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
              cursor: 'pointer',
            }}
            aria-label="Buscar (⌘K)"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          role="main"
          tabIndex={-1}
          style={{ background: 'var(--bg)' }}
        >
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
