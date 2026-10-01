import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

export interface TokenBucketOptions {
  capacity: number;       // Maximum burst capacity (e.g. 60 tokens)
  refillRate: number;     // Tokens added per second (e.g. 1.0 = 1 token/sec)
  cost?: number;          // Tokens consumed per request (default: 1)
  prefix?: string;        // Storage key prefix (e.g. 'tb:api', 'tb:auth')
  keyGenerator?: (req: Request) => string; // Function to extract client identifier
  message?: string;       // Custom Indonesian message when limit is hit
  redisClient?: Redis | null;
  isRedisConnected?: () => boolean;
}

interface InMemoryBucket {
  tokens: number;
  lastRefill: number; // Unix timestamp in milliseconds
}

// In-memory store for fallback or local mode
const inMemoryStore = new Map<string, InMemoryBucket>();

// Periodic garbage collection for stale memory buckets (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of inMemoryStore.entries()) {
      // If bucket has been idle for more than 10 minutes, delete it to prevent memory leak
      if (now - bucket.lastRefill > 10 * 60 * 1000) {
        inMemoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();
}

/**
 * Creates an Express middleware that implements the Token Bucket Rate Limiting algorithm.
 * Supports Upstash/local Redis when connected, with automatic fallback to high-efficiency in-memory storage.
 */
export function createTokenBucketMiddleware(options: TokenBucketOptions) {
  const {
    capacity,
    refillRate,
    cost = 1,
    prefix = 'tb:default',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      }
      return req.ip || req.socket.remoteAddress || '127.0.0.1';
    },
    message = 'Batas laju permintaan terlampaui (Rate limit exceeded). Token bucket kosong. Silakan tunggu beberapa saat.',
    redisClient,
    isRedisConnected = () => false,
  } = options;

  return async function tokenBucketMiddleware(req: Request, res: Response, next: NextFunction) {
    const clientKey = keyGenerator(req);
    const storageKey = `${prefix}:${clientKey}`;
    const now = Date.now();

    try {
      // 1. If Redis is available, attempt Redis-backed Token Bucket
      if (redisClient && isRedisConnected()) {
        try {
          const redisData = await redisClient.mget(`${storageKey}:tokens`, `${storageKey}:lastRefill`);
          let currentTokens = redisData[0] !== null ? parseFloat(redisData[0]) : capacity;
          const lastRefill = redisData[1] !== null ? parseInt(redisData[1], 10) : now;

          // Calculate token accrual based on time elapsed
          const elapsedSeconds = Math.max(0, (now - lastRefill) / 1000);
          currentTokens = Math.min(capacity, currentTokens + elapsedSeconds * refillRate);

          if (currentTokens >= cost) {
            currentTokens -= cost;
            const ttlSeconds = Math.ceil(capacity / refillRate) * 2 + 10;
            
            // Persist updated state to Redis
            await redisClient
              .pipeline()
              .set(`${storageKey}:tokens`, currentTokens.toString(), 'EX', ttlSeconds)
              .set(`${storageKey}:lastRefill`, now.toString(), 'EX', ttlSeconds)
              .exec();

            const remaining = Math.max(0, Math.floor(currentTokens));
            const resetInSeconds = Math.ceil((capacity - currentTokens) / refillRate);

            res.setHeader('X-RateLimit-Limit', capacity);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', resetInSeconds);
            res.setHeader('X-RateLimit-Algorithm', 'Token-Bucket (Redis)');

            return next();
          } else {
            // Rate limit exceeded
            const retryAfter = Math.max(1, Math.ceil((cost - currentTokens) / refillRate));
            
            res.setHeader('Retry-After', retryAfter);
            res.setHeader('X-RateLimit-Limit', capacity);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', retryAfter);
            res.setHeader('X-RateLimit-Algorithm', 'Token-Bucket (Redis)');

            return res.status(429).json({
              success: false,
              error: 'Too Many Requests',
              message,
              algorithm: 'Token Bucket',
              storage: 'Redis',
              capacity,
              remaining: 0,
              retryAfterSeconds: retryAfter,
              refillRatePerSec: refillRate,
            });
          }
        } catch (redisErr) {
          // If Redis throws, seamlessly degrade to memory store below
          console.warn('⚠️ Redis rate limiter error, falling back to in-memory:', (redisErr as Error).message);
        }
      }

      // 2. Fallback to in-memory Token Bucket
      let bucket = inMemoryStore.get(storageKey);
      if (!bucket) {
        bucket = {
          tokens: capacity,
          lastRefill: now,
        };
        inMemoryStore.set(storageKey, bucket);
      } else {
        // Refill tokens based on elapsed time
        const elapsedSeconds = Math.max(0, (now - bucket.lastRefill) / 1000);
        bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillRate);
        bucket.lastRefill = now;
      }

      if (bucket.tokens >= cost) {
        bucket.tokens -= cost;
        const remaining = Math.max(0, Math.floor(bucket.tokens));
        const resetInSeconds = Math.ceil((capacity - bucket.tokens) / refillRate);

        res.setHeader('X-RateLimit-Limit', capacity);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetInSeconds);
        res.setHeader('X-RateLimit-Algorithm', 'Token-Bucket (Memory)');

        return next();
      } else {
        // Rate limit exceeded
        const retryAfter = Math.max(1, Math.ceil((cost - bucket.tokens) / refillRate));

        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', capacity);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', retryAfter);
        res.setHeader('X-RateLimit-Algorithm', 'Token-Bucket (Memory)');

        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message,
          algorithm: 'Token Bucket',
          storage: 'In-Memory',
          capacity,
          remaining: 0,
          retryAfterSeconds: retryAfter,
          refillRatePerSec: refillRate,
        });
      }
    } catch (err: any) {
      console.error('Error in token bucket rate limiter:', err);
      // Fail open so we never block legitimate users on internal unexpected errors
      return next();
    }
  };
}

/**
 * Helper function to inspect current bucket status for diagnostics
 */
export function getBucketStatus(key: string, capacity: number, refillRate: number) {
  const bucket = inMemoryStore.get(key);
  if (!bucket) {
    return {
      tokens: capacity,
      capacity,
      refillRate,
      status: 'FULL',
    };
  }
  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - bucket.lastRefill) / 1000);
  const currentTokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillRate);
  return {
    tokens: Math.floor(currentTokens * 100) / 100,
    capacity,
    refillRate,
    status: currentTokens < 1 ? 'EXHAUSTED' : 'AVAILABLE',
  };
}
