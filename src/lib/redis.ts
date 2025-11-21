import Redis from 'ioredis';
import config from '@config/index';
import logger from './logger';

let redis: Redis | null = null;

if (config.features.enableCaching) {
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  redis.on('connect', () => {
    logger.info('Redis client connected');
  });

  redis.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  redis.on('close', () => {
    logger.warn('Redis client connection closed');
  });
}

// Cache helper functions
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!redis) return;
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  },

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!redis) return;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!redis) return false;
    
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  },

  /**
   * Set expiration on key
   */
  async expire(key: string, ttl: number): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.expire(key, ttl);
    } catch (error) {
      logger.error('Cache expire error:', error);
    }
  },

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    if (!redis) return 0;
    
    try {
      return await redis.incr(key);
    } catch (error) {
      logger.error('Cache incr error:', error);
      return 0;
    }
  },

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    if (!redis) return -1;
    
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error('Cache ttl error:', error);
      return -1;
    }
  },
};

// Cache key generators
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  company: (companyId: string) => `company:${companyId}`,
  employee: (employeeId: string) => `employee:${employeeId}`,
  permissions: (userId: string) => `permissions:${userId}`,
  payslip: (payslipId: string) => `payslip:${payslipId}`,
};

export default redis;