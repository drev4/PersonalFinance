import { create } from 'zustand';

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'recurring_due'
  | 'sync_error'
  | 'price_alert'
  | 'goal_reached'
  | 'report_ready';

export interface PushNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationState {
  expoPushToken: string | null;
  permissionStatus: 'undetermined' | 'denied' | 'granted' | null;
  unreadCount: number;
  recentNotifications: PushNotification[];

  setExpoPushToken: (token: string) => void;
  setPermissionStatus: (status: 'undetermined' | 'denied' | 'granted') => void;
  setUnreadCount: (count: number) => void;
  setRecentNotifications: (notifications: PushNotification[]) => void;
  addNotification: (notification: PushNotification) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  expoPushToken: null,
  permissionStatus: null,
  unreadCount: 0,
  recentNotifications: [],

  setExpoPushToken: (token) => set({ expoPushToken: token }),
  setPermissionStatus: (status) => set({ permissionStatus: status }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setRecentNotifications: (notifications) => set({ recentNotifications: notifications }),
  addNotification: (notification) =>
    set((state) => ({
      recentNotifications: [notification, ...state.recentNotifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),
  clearNotifications: () => set({ recentNotifications: [], unreadCount: 0 }),
}));
