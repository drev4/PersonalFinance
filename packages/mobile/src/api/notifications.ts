import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import client from './client';

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'budget_warning'
    | 'budget_exceeded'
    | 'recurring_due'
    | 'sync_error'
    | 'price_alert'
    | 'goal_reached'
    | 'report_ready';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

async function getNotifications(page = 1, limit = 20): Promise<NotificationListResponse> {
  const response = await client.get<NotificationListResponse>(
    `/notifications?page=${page}&limit=${limit}`,
  );
  return response.data;
}

async function getUnreadCount(): Promise<{ count: number }> {
  const response = await client.get<{ count: number }>('/notifications/unread-count');
  return response.data;
}

async function markAsRead(id: string): Promise<void> {
  await client.patch(`/notifications/${id}/read`, {});
}

async function markAllAsRead(): Promise<void> {
  await client.patch('/notifications/read-all', {});
}

async function deleteRead(): Promise<void> {
  await client.delete('/notifications/read');
}

export const useNotifications = (page = 1, limit = 20) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: () => getNotifications(page, limit),
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUnreadCount = () => {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    enabled: !!accessToken,
    staleTime: 1000 * 60,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useDeleteRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
