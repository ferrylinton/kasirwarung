import { Redis } from 'ioredis';
import { REDIS_URL } from './env.ts';
import { tokenStore } from '../tokenStore.ts';

let redisClient: Redis | null = null;
let redisConnected = false;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    redisClient
      .connect()
      .then(() => {
        redisConnected = true;
        console.log('✅ Connected to Redis');
      })
      .catch((err) => {
        console.warn('⚠️ Redis connection error:', err.message);
        redisConnected = false;
      });

    redisClient.on('error', () => {
      redisConnected = false;
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization error');
  }
}

// Hook up tokenStore with Redis client and connection status
tokenStore.setRedis(redisClient, () => redisConnected);

export const getRedisClient = () => redisClient;
export const isRedisConnected = () => redisConnected;
