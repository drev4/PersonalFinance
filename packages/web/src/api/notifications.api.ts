import { apiClient } from '../lib/api';
import type { AppNotification, PaginatedResponse, UnreadCount } from '../types/api';

export async function getNotifications(params?: {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AppNotification>> {
  const response = await apiClient.get<{ data: PaginatedResponse<AppNotification> }>(
    '/notifications',
    { params },
  );
  return response.data.data;
}

export async function getUnreadCount(): Promise<UnreadCount> {
  const response = await apiClient.get<{ data: UnreadCount }>('/notifications/unread-count');
  return response.data.data;
}

export async function markAsRead(ids: string[]): Promise<void> {
  await apiClient.patch('/notifications/mark-read', { ids });
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.patch('/notifications/mark-all-read');
}

export async function deleteReadNotifications(): Promise<void> {
  await apiClient.delete('/notifications/read');
}
