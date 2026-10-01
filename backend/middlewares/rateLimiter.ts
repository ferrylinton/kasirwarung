import { createTokenBucketMiddleware, getBucketStatus } from '../tokenBucket.ts';
import { getRedisClient, isRedisConnected } from '../config/redis.ts';

// 1. Global API Limiter: Capacity of 60 tokens, refills at 2 tokens/sec (burst 60, sustains 120 req/min)
export const globalTokenBucket = createTokenBucketMiddleware({
  capacity: 60,
  refillRate: 2,
  cost: 1,
  prefix: 'tb:global',
  message: 'Batas laju permintaan API umum terlampaui. Token bucket habis. Silakan tunggu beberapa detik.',
  redisClient: getRedisClient(),
  isRedisConnected,
});

// 2. Strict Auth Limiter: Protects login, register, and verification against brute-force attacks
// Capacity: 10 tokens, refills at 0.5 tokens/sec (1 token every 2 seconds)
export const authRateLimiter = createTokenBucketMiddleware({
  capacity: 10,
  refillRate: 0.5,
  cost: 1,
  prefix: 'tb:auth',
  message: 'Terlalu banyak percobaan autentikasi (Rate limit). Demi keamanan, silakan tunggu beberapa detik.',
  redisClient: getRedisClient(),
  isRedisConnected,
});

export { getBucketStatus };
