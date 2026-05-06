import axios from 'axios';
import pino from 'pino';
import { getUserPushTokens } from '../users/user.repository.js';

const logger = pino({ name: 'push.service' });

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_BATCH_SIZE = 100;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
  badge?: number;
}

function isValidExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

/**
 * Sends a push notification to all registered devices of the given user.
 * Fires the HTTP request to the Expo Push API.
 * Errors are logged but never thrown — push is best-effort.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const tokens = await getUserPushTokens(userId);
  const validTokens = tokens.filter(isValidExpoPushToken);
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: 'default',
  }));

  for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
    try {
      await axios.post(EXPO_PUSH_URL, batch, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        timeout: 8000,
      });
    } catch (err) {
      logger.error({ err, userId, batchStart: i }, 'Failed to send push notification batch');
    }
  }
}
