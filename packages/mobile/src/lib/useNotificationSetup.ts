import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import client from '@/api/client';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotificationSetup = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setExpoPushToken = useNotificationStore((state) => state.setExpoPushToken);
  const setPermissionStatus = useNotificationStore((state) => state.setPermissionStatus);

  useEffect(() => {
    if (!accessToken) return;

    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
          setPermissionStatus(status as 'undetermined' | 'denied' | 'granted');
        } else {
          setPermissionStatus('granted');
        }

        if (finalStatus !== 'granted') {
          console.log('Notification permissions not granted');
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync();
        setExpoPushToken(token.data);

        await client.post('/users/push-token', {
          token: token.data,
        });
      } catch (error) {
        console.error('Failed to setup notifications:', error);
      }
    };

    setupNotifications();
  }, [accessToken, setExpoPushToken, setPermissionStatus]);

  useEffect(() => {
    if (!accessToken) return;

    const notificationListener = Notifications.addNotificationReceivedListener(() => {
      // Handle foreground notification if needed
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(() => {
      // Handle notification tap/deep linking if needed
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [accessToken]);
};
