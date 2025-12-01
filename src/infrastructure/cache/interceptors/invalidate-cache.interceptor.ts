// libs/core/cache/interceptors/invalidate-cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../cache.service';
import {
  INVALIDATE_CACHE_KEY,
  InvalidateCacheOptions,
} from '../decorators/invalidate-cache.decorator';

@Injectable()
export class InvalidateCacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const invalidateOptions = this.reflector.get<InvalidateCacheOptions>(
      INVALIDATE_CACHE_KEY,
      context.getHandler(),
    );

    // If no invalidation options, proceed without invalidation
    if (!invalidateOptions) {
      return next.handle();
    }

    // Execute handler first, then invalidate cache
    return next.handle().pipe(
      tap(async () => {
        await this.invalidateCache(invalidateOptions, request);
      }),
    );
  }

  private async invalidateCache(
    options: InvalidateCacheOptions,
    request: any,
  ): Promise<void> {
    try {
      // Invalidate by module and endpoint
      if (options.endpoint) {
        const params: Record<string, any> = {};

        // Include route params if available
        if (request.params && Object.keys(request.params).length > 0) {
          Object.assign(params, request.params);
        }

        if (options.includeUserId && request.user?.id) {
          // Invalidate user-specific cache
          params.userId = request.user.id;
          await this.cacheService.invalidate(
            options.module,
            options.endpoint,
            params,
          );
        } else if (Object.keys(params).length > 0) {
          // Invalidate specific cache with route params
          await this.cacheService.invalidate(
            options.module,
            options.endpoint,
            params,
          );
        } else {
          // Invalidate all endpoint caches
          await this.cacheService.invalidateEndpoint(
            options.module,
            options.endpoint,
          );
        }
      } else {
        // Invalidate entire module
        await this.cacheService.invalidateModule(options.module);
      }

      // Invalidate additional keys if specified (supports patterns)
      if (options.additionalKeys) {
        for (const key of options.additionalKeys) {
          if (key.includes('*')) {
            // Pattern-based invalidation
            await this.cacheService.delPattern(key);
          } else {
            // Direct key invalidation
            await this.cacheService.del(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
      // Don't throw - cache invalidation failure shouldn't break the request
    }
  }
}
