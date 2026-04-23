import type React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Calendar,
  RefreshCw,
  Trophy,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDate } from '../../lib/formatters';
import type { AppNotification, NotificationType } from '../../types/api';

interface NotificationIconProps {
  type: NotificationType;
}

function NotificationIcon({ type }: NotificationIconProps): React.ReactElement {
  switch (type) {
    case 'budget_warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" aria-hidden="true" />;
    case 'budget_exceeded':
      return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" aria-hidden="true" />;
    case 'recurring_due':
      return <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" aria-hidden="true" />;
    case 'sync_error':
      return <RefreshCw className="h-4 w-4 text-red-500 flex-shrink-0" aria-hidden="true" />;
    case 'goal_reached':
      return <Trophy className="h-4 w-4 text-green-500 flex-shrink-0" aria-hidden="true" />;
    case 'report_ready':
      return <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" aria-hidden="true" />;
    case 'price_alert':
      return <TrendingUp className="h-4 w-4 text-orange-500 flex-shrink-0" aria-hidden="true" />;
  }
}

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  showMarkReadButton?: boolean;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  showMarkReadButton = false,
}: NotificationItemProps): React.ReactElement {
  const actionUrl =
    typeof notification.data?.['action_url'] === 'string'
      ? notification.data['action_url']
      : undefined;

  function handleClick(): void {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg px-3 py-3 transition-colors',
        notification.isRead ? 'bg-white' : 'bg-blue-50',
        (actionUrl || !notification.isRead) && 'cursor-pointer hover:bg-gray-50',
      )}
      onClick={handleClick}
      role={actionUrl ? 'link' : 'article'}
      tabIndex={actionUrl ? 0 : undefined}
      onKeyDown={(e) => {
        if (actionUrl && (e.key === 'Enter' || e.key === ' ')) {
          handleClick();
        }
      }}
      aria-label={`${notification.title}${notification.isRead ? '' : ' — no leida'}`}
    >
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
        <NotificationIcon type={notification.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm leading-snug text-gray-900',
            !notification.isRead && 'font-semibold',
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{notification.message}</p>
        <p className="mt-1 text-[10px] text-gray-400">
          {formatDate(notification.createdAt, 'relative')}
        </p>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {!notification.isRead && (
          <span
            className="inline-block h-2 w-2 rounded-full bg-blue-500"
            aria-label="No leida"
          />
        )}
        {showMarkReadButton && !notification.isRead && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification._id);
            }}
            className="mt-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={`Marcar como leida: ${notification.title}`}
          >
            Marcar leida
          </button>
        )}
      </div>
    </div>
  );
}
