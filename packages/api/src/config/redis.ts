import Redis from 'ioredis';
import env from './env.js';

let redisClient: Redis | null = null;

export function createRedisClient(): Redis {
  if (redisClient !== null) {
    return redisClient;
  }

  redisClient = new Redis(env.REDIS_URL, {
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
    retryStrategy(times: number): number | null {
      if (times > 10) {
        console.error('[Redis] Max reconnection attempts reached');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    reconnectOnError(err: Error): boolean {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  redisClient.on('connect', () => {
    console.info('[Redis] Connecting...');
  });

  redisClient.on('ready', () => {
    console.info('[Redis] Client ready');
  });

  redisClient.on('error', (err: Error) => {
    console.error('[Redis] Error:', err.message);
  });

  redisClient.on('close', () => {
    console.warn('[Redis] Connection closed');
  });

  redisClient.on('reconnecting', () => {
    console.warn('[Redis] Reconnecting...');
  });

  return redisClient;
}

export function getRedisClient(): Redis {
  if (redisClient === null) {
    return createRedisClient();
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient !== null) {
    await redisClient.quit();
    redisClient = null;
    console.info('[Redis] Client closed gracefully');
  }
}
