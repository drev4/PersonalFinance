import { useState } from 'react';
import type React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUnreadCount } from '../../hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';

function UnreadBadge({ count }: { count: number }): React.ReactElement | null {
  if (count === 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white"
      aria-label={`${label} notificaciones sin leer`}
    >
      {label}
    </span>
  );
}

export function NotificationBell(): React.ReactElement {
  const [panelOpen, setPanelOpen] = useState(false);
  const { data } = useUnreadCount();
  const unreadCount = data?.count ?? 0;

  function togglePanel(): void {
    setPanelOpen((prev) => !prev);
  }

  function closePanel(): void {
    setPanelOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        className={cn(
          'relative rounded-lg p-2 text-gray-500 transition-colors',
          'hover:bg-gray-100 hover:text-gray-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          panelOpen && 'bg-gray-100 text-gray-700',
        )}
        aria-label={
          unreadCount > 0
            ? `Abrir notificaciones — ${unreadCount} sin leer`
            : 'Abrir notificaciones'
        }
        aria-expanded={panelOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        <UnreadBadge count={unreadCount} />
      </button>

      {panelOpen && <NotificationPanel onClose={closePanel} />}
    </div>
  );
}
