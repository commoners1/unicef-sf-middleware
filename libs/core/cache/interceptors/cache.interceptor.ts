// libs/core/cache/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../cache.service';
import { CACHE_KEY, CacheOptions } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheOptions = this.reflector.get<CacheOptions>(CACHE_KEY, context.getHandler());

    // If no cache options, proceed without caching
    if (!cacheOptions) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(cacheOptions, request);

    // Try to get from cache
    const cachedValue = await this.cacheService.get(cacheKey);
    if (cachedValue !== undefined) {
      return of(cachedValue);
    }

    // If not in cache, execute handler and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        const ttl = cacheOptions.ttl || 5 * 60 * 1000; // Default 5 minutes
        await this.cacheService.set(cacheKey, data, ttl);
      }),
    );
  }

  private generateCacheKey(options: CacheOptions, request: any): string {
    if (options.keyGenerator) {
      return options.keyGenerator([], request);
    }

    const params: Record<string, any> = {};

    // Include user ID if specified
    if (options.includeUserId && request.user?.id) {
      params.userId = request.user.id;
    }

    // Include route params if available (e.g., :id, :type)
    if (request.params && Object.keys(request.params).length > 0) {
      Object.assign(params, request.params);
    }

    // Include query parameters if specified
    if (options.includeQuery && request.query) {
      // Only include non-empty query params
      Object.keys(request.query).forEach(key => {
        const value = request.query[key];
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      });
    }

    // If no params, pass undefined to generate simple key
    const hasParams = Object.keys(params).length > 0;
    return this.cacheService.generateKey(
      options.module, 
      options.endpoint, 
      hasParams ? params : undefined
    );
  }
}

