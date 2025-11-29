// libs/core/cache/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Cache key format: {module}:{endpoint}:{params}
 * Examples:
 * - audit:dashboard:stats
 * - audit:actions
 * - queue:monitor:health
 * - user:profile:{userId}
 * - settings:all
 */
@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Generate a standardized cache key
   * @param module - Module name (e.g., 'audit', 'queue', 'user')
   * @param endpoint - Endpoint name (e.g., 'stats', 'health', 'profile')
   * @param params - Optional parameters to include in key (e.g., userId, filters)
   */
  generateKey(module: string, endpoint: string, params?: Record<string, any> | string): string {
    const parts = [module, endpoint];
    
    if (params) {
      if (typeof params === 'string') {
        parts.push(params);
      } else {
        // Sort keys for consistent key generation
        const sortedParams = Object.keys(params)
          .sort()
          .map(key => `${key}:${params[key]}`)
          .join(':');
        if (sortedParams) {
          parts.push(sortedParams);
        }
      }
    }
    
    return parts.join(':');
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value ?? undefined;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a specific cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple cache keys by pattern
   * Note: This requires iterating through keys, which may be slow for large caches
   * For Redis, consider using SCAN command for better performance
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // For in-memory cache, we need to get all keys and filter
      // For Redis, this would use SCAN command
      const keys = await this.getAllKeys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      for (const key of keys) {
        if (regex.test(key)) {
          await this.del(key);
        }
      }
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Invalidate cache by module
   * @param module - Module name to invalidate (e.g., 'audit', 'queue')
   */
  async invalidateModule(module: string): Promise<void> {
    await this.delPattern(`${module}:*`);
  }

  /**
   * Invalidate cache by module and endpoint
   * @param module - Module name
   * @param endpoint - Endpoint name
   */
  async invalidateEndpoint(module: string, endpoint: string): Promise<void> {
    await this.delPattern(`${module}:${endpoint}:*`);
  }

  /**
   * Invalidate specific cache key
   * @param module - Module name
   * @param endpoint - Endpoint name
   * @param params - Optional parameters
   */
  async invalidate(module: string, endpoint: string, params?: Record<string, any> | string): Promise<void> {
    const key = this.generateKey(module, endpoint, params);
    await this.del(key);
  }

  /**
   * Clear all cache
   * Note: This is a best-effort operation. For Redis, consider using FLUSHDB command directly.
   */
  async reset(): Promise<void> {
    try {
      // cache-manager v6 doesn't have reset() method
      // For in-memory cache, we can delete all keys
      // For Redis, this would require direct Redis client access
      // For now, we'll log a warning and do nothing
      console.warn('Cache reset is not directly supported. Use delPattern or invalidateModule instead.');
    } catch (error) {
      console.error('Cache reset error:', error);
    }
  }

  /**
   * Get all cache keys (implementation depends on cache store)
   * Note: This may not be available for all cache stores
   */
  private async getAllKeys(): Promise<string[]> {
    // This is a placeholder - actual implementation depends on cache store
    // For Redis, you would use SCAN command
    // For in-memory, you might need to track keys separately
    return [];
  }
}

