import { useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import { Button } from '../ui/button';
import { NotificationItem } from './NotificationItem';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../hooks/useNotifications';

interface NotificationPanelProps {
  onClose: () => void;
}

function NotificationListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-1 px-2 py-1" aria-busy="true" aria-label="Cargando notificaciones">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface NotificationListProps {
  unreadOnly?: boolean;
  onMarkAsRead: (id: string) => void;
}

function NotificationList({ unreadOnly, onMarkAsRead }: NotificationListProps): React.ReactElement {
  const { data, isLoading } = useNotifications({ unreadOnly, page: 1 });

  if (isLoading) return <NotificationListSkeleton />;

  const notifications = data?.data ?? [];

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title={unreadOnly ? 'Sin notificaciones sin leer' : 'Sin notificaciones'}
          description={
            unreadOnly
              ? 'Todas tus notificaciones han sido leidas.'
              : 'No tienes notificaciones por el momento.'
          }
          className="border-none py-6"
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50 px-2 py-1">
      {notifications.map((n) => (
        <NotificationItem key={n._id} notification={n} onMarkAsRead={onMarkAsRead} />
      ))}
    </div>
  );
}

export function NotificationPanel({ onClose }: NotificationPanelProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<string>('all');
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  function handleMarkAsRead(id: string): void {
    markAsRead.mutate([id]);
  }

  function handleMarkAllAsRead(): void {
    markAllAsRead.mutate();
  }

  return (
    <>
      {/* Invisible backdrop */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="absolute right-0 top-full z-40 mt-2 w-[22rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-label="Centro de notificaciones"
        aria-modal="false"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Notificaciones</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            {markAllAsRead.isPending ? 'Marcando...' : 'Marcar todas como leidas'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4">
            <TabsList className="py-1">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">No leidas</TabsTrigger>
            </TabsList>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            <TabsContent value="all">
              <NotificationList onMarkAsRead={handleMarkAsRead} />
            </TabsContent>
            <TabsContent value="unread">
              <NotificationList unreadOnly onMarkAsRead={handleMarkAsRead} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2.5 text-center">
          <Link
            to="/notifications"
            onClick={onClose}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Ver todas las notificaciones
          </Link>
        </div>
      </div>
    </>
  );
}
