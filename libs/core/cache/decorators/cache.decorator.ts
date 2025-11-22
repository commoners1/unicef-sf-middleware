// libs/core/cache/decorators/cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export interface CacheOptions {
  /**
   * Time to live in milliseconds
   */
  ttl?: number;
  
  /**
   * Module name for cache key generation
   */
  module: string;
  
  /**
   * Endpoint name for cache key generation
   */
  endpoint: string;
  
  /**
   * Whether to include user ID in cache key (for user-specific data)
   */
  includeUserId?: boolean;
  
  /**
   * Whether to include query parameters in cache key
   */
  includeQuery?: boolean;
  
  /**
   * Custom key generator function
   */
  keyGenerator?: (args: any[], req?: any) => string;
}

export const CACHE_KEY = 'cache:options';

/**
 * Decorator to enable caching on an endpoint
 * 
 * @example
 * @Cache({ module: 'audit', endpoint: 'stats', ttl: 120000 })
 * @Get('stats')
 * async getStats() { ... }
 * 
 * @example
 * @Cache({ module: 'user', endpoint: 'profile', includeUserId: true, ttl: 300000 })
 * @Get('profile')
 * async getProfile(@Request() req) { ... }
 */
export const Cache = (options: CacheOptions) => SetMetadata(CACHE_KEY, options);

