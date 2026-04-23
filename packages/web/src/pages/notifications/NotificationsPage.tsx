import { useState } from 'react';
import type React from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteReadNotifications,
} from '../../hooks/useNotifications';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-1" aria-busy="true" aria-label="Cargando notificaciones">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-4"
        >
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Notification list for a given tab ────────────────────────────────────────

interface NotificationTabContentProps {
  unreadOnly?: boolean;
}

function NotificationTabContent({
  unreadOnly,
}: NotificationTabContentProps): React.ReactElement {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications({ unreadOnly, page });
  const markAsRead = useMarkAsRead();

  function handleMarkAsRead(id: string): void {
    markAsRead.mutate([id]);
  }

  if (isLoading) return <NotificationsSkeleton />;

  const notifications = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-8 w-8" />}
        title={unreadOnly ? 'Sin notificaciones sin leer' : 'Sin notificaciones'}
        description={
          unreadOnly
            ? 'Todas tus notificaciones han sido leidas. Bien hecho.'
            : 'No tienes ninguna notificacion todavia.'
        }
        className="mt-2"
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-50">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            showMarkReadButton
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-500">
            Pagina {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage(): React.ReactElement {
  const markAllAsRead = useMarkAllAsRead();
  const deleteRead = useDeleteReadNotifications();

  function handleMarkAllAsRead(): void {
    markAllAsRead.mutate();
  }

  function handleDeleteRead(): void {
    deleteRead.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Mantente al tanto de lo que ocurre en tu cuenta.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            {markAllAsRead.isPending ? 'Marcando...' : 'Marcar todo leido'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteRead}
            disabled={deleteRead.isPending}
            className="gap-1.5 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {deleteRead.isPending ? 'Eliminando...' : 'Eliminar leidas'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">No leidas</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NotificationTabContent />
        </TabsContent>

        <TabsContent value="unread">
          <NotificationTabContent unreadOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
}
