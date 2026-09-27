/**
 * Token Denylist (Blocklist) and Redis/In-Memory Session Store
 * 
 * Features:
 * - Token Denylist with TTL matching token expiration
 * - Tracking active logged-in user status with TTL
 * - Automatic fallback to high-efficiency In-Memory Map with TTL GC when Redis is unavailable
 */

import { Redis } from 'ioredis';

interface MemoryEntry {
  val: string;
  expiresAt: number; // Unix timestamp in ms
}

class TokenStore {
  private inMemoryDenylist = new Map<string, number>(); // jti -> expiresAt (ms)
  private inMemoryUserSessions = new Map<string, MemoryEntry>(); // key -> { val, expiresAt }
  private redisClient: Redis | null = null;
  private isRedisConnected: () => boolean = () => false;

  constructor() {
    // Periodic garbage collection for memory stores every 60 seconds
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const now = Date.now();
        for (const [jti, exp] of this.inMemoryDenylist.entries()) {
          if (exp <= now) {
            this.inMemoryDenylist.delete(jti);
          }
        }
        for (const [k, entry] of this.inMemoryUserSessions.entries()) {
          if (entry.expiresAt <= now) {
            this.inMemoryUserSessions.delete(k);
          }
        }
      }, 60 * 1000).unref();
    }
  }

  public setRedis(client: Redis | null, isConnected: () => boolean) {
    this.redisClient = client;
    this.isRedisConnected = isConnected;
  }

  /**
   * Add a JWT unique identifier (jti) to the denylist with a TTL in seconds.
   */
  async addToDenylist(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti || ttlSeconds <= 0) return;
    const expMs = Date.now() + ttlSeconds * 1000;

    // Always record to in-memory store for instant fallback
    this.inMemoryDenylist.set(jti, expMs);

    // If Redis is connected, store with EX ttl
    if (this.redisClient && this.isRedisConnected()) {
      try {
        await this.redisClient.set(`denylist:jti:${jti}`, 'revoked', 'EX', Math.ceil(ttlSeconds));
      } catch (err: any) {
        console.warn('⚠️ Error writing JTI to Redis denylist:', err.message);
      }
    }
  }

  /**
   * Check if a token's jti is in the denylist.
   * Returns true if revoked/denylisted, false otherwise.
   */
  async isDenylisted(jti: string): Promise<boolean> {
    if (!jti) return false;

    // Check Redis first if available
    if (this.redisClient && this.isRedisConnected()) {
      try {
        const res = await this.redisClient.get(`denylist:jti:${jti}`);
        if (res !== null) return true;
      } catch (err: any) {
        console.warn('⚠️ Error checking JTI in Redis:', err.message);
      }
    }

    // Check In-Memory fallback
    const exp = this.inMemoryDenylist.get(jti);
    if (exp) {
      if (exp > Date.now()) {
        return true;
      } else {
        this.inMemoryDenylist.delete(jti);
      }
    }

    return false;
  }

  /**
   * Track logged user status in Redis (and in-memory fallback) with TTL matching token's expiration.
   */
  async setLoggedUserStatus(userId: string, statusData: any, ttlSeconds: number): Promise<void> {
    if (!userId || ttlSeconds <= 0) return;
    const jsonStr = JSON.stringify(statusData);
    const expMs = Date.now() + ttlSeconds * 1000;

    this.inMemoryUserSessions.set(`user:status:${userId}`, {
      val: jsonStr,
      expiresAt: expMs,
    });

    if (this.redisClient && this.isRedisConnected()) {
      try {
        await this.redisClient.set(`user:status:${userId}`, jsonStr, 'EX', Math.ceil(ttlSeconds));
      } catch (err: any) {
        console.warn('⚠️ Error setting user status in Redis:', err.message);
      }
    }
  }

  /**
   * Remove logged user status (e.g. on logout).
   */
  async removeLoggedUserStatus(userId: string): Promise<void> {
    this.inMemoryUserSessions.delete(`user:status:${userId}`);
    if (this.redisClient && this.isRedisConnected()) {
      try {
        await this.redisClient.del(`user:status:${userId}`);
      } catch (err: any) {
        console.warn('⚠️ Error deleting user status from Redis:', err.message);
      }
    }
  }

  /**
   * Get logged user status from Redis or In-Memory.
   */
  async getLoggedUserStatus(userId: string): Promise<any | null> {
    if (this.redisClient && this.isRedisConnected()) {
      try {
        const data = await this.redisClient.get(`user:status:${userId}`);
        if (data) return JSON.parse(data);
      } catch (err: any) {
        console.warn('⚠️ Error fetching user status from Redis:', err.message);
      }
    }

    const entry = this.inMemoryUserSessions.get(`user:status:${userId}`);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        try {
          return JSON.parse(entry.val);
        } catch {
          return entry.val;
        }
      } else {
        this.inMemoryUserSessions.delete(`user:status:${userId}`);
      }
    }

    return null;
  }

  /**
   * Store Refresh Token in Redis or In-Memory with TTL
   */
  async storeRefreshToken(userId: string, refreshTokenJti: string, ttlSeconds: number): Promise<void> {
    const expMs = Date.now() + ttlSeconds * 1000;
    this.inMemoryUserSessions.set(`refresh:${userId}:${refreshTokenJti}`, {
      val: 'valid',
      expiresAt: expMs,
    });

    if (this.redisClient && this.isRedisConnected()) {
      try {
        await this.redisClient.set(`refresh:${userId}:${refreshTokenJti}`, 'valid', 'EX', Math.ceil(ttlSeconds));
      } catch (err: any) {
        console.warn('⚠️ Error storing refresh token in Redis:', err.message);
      }
    }
  }

  /**
   * Validate and remove Refresh Token
   */
  async consumeRefreshToken(userId: string, refreshTokenJti: string): Promise<boolean> {
    let isValid = false;

    if (this.redisClient && this.isRedisConnected()) {
      try {
        const res = await this.redisClient.get(`refresh:${userId}:${refreshTokenJti}`);
        if (res !== null) {
          isValid = true;
          await this.redisClient.del(`refresh:${userId}:${refreshTokenJti}`);
        }
      } catch (err: any) {
        console.warn('⚠️ Error checking refresh token in Redis:', err.message);
      }
    }

    const key = `refresh:${userId}:${refreshTokenJti}`;
    const mem = this.inMemoryUserSessions.get(key);
    if (mem) {
      if (mem.expiresAt > Date.now()) {
        isValid = true;
      }
      this.inMemoryUserSessions.delete(key);
    }

    return isValid;
  }
}

export const tokenStore = new TokenStore();
