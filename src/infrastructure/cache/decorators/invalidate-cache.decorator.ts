// libs/core/cache/decorators/invalidate-cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export interface InvalidateCacheOptions {
  /**
   * Module name to invalidate
   */
  module: string;

  /**
   * Endpoint name to invalidate (optional - if not provided, invalidates entire module)
   */
  endpoint?: string;

  /**
   * Whether to invalidate user-specific cache
   */
  includeUserId?: boolean;

  /**
   * Additional cache keys to invalidate
   */
  additionalKeys?: string[];
}

export const INVALIDATE_CACHE_KEY = 'invalidate-cache:options';

/**
 * Decorator to invalidate cache on write operations
 *
 * @example
 * @InvalidateCache({ module: 'settings' })
 * @Put()
 * async updateSettings() { ... }
 *
 * @example
 * @InvalidateCache({ module: 'user', endpoint: 'profile', includeUserId: true })
 * @Put('profile')
 * async updateProfile(@Request() req) { ... }
 */
export const InvalidateCache = (options: InvalidateCacheOptions) =>
  SetMetadata(INVALIDATE_CACHE_KEY, options);
