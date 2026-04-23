import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteReadNotifications,
} from '../api/notifications.api';
import type { AppNotification, PaginatedResponse, UnreadCount } from '../types/api';

const STALE_TIME = 1000 * 60 * 2; // 2 minutes

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: { unreadOnly?: boolean; page?: number }) =>
    [...notificationKeys.lists(), params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useNotifications(params?: {
  unreadOnly?: boolean;
  page?: number;
}): UseQueryResult<PaginatedResponse<AppNotification>> {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => getNotifications({ ...params, limit: 10 }),
    staleTime: STALE_TIME,
  });
}

export function useUnreadCount(): UseQueryResult<UnreadCount> {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkAsRead(): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

export function useMarkAllAsRead(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

export function useDeleteReadNotifications(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReadNotifications,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
