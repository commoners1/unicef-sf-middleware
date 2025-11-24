# Caching Implementation Guide

## Overview

This project implements a comprehensive caching system using Redis (with in-memory fallback) to improve API performance and reduce database load.

## Architecture

### Components

1. **CacheModule** (`libs/core/cache/cache.module.ts`)
   - Global module that configures Redis cache store
   - Falls back to in-memory cache if Redis is unavailable
   - Default TTL: 5 minutes

2. **CacheService** (`libs/core/cache/cache.service.ts`)
   - Provides cache key generation utilities
   - Standardized key format: `{module}:{endpoint}:{params}`
   - Methods for get, set, delete, and pattern-based invalidation

3. **Cache Decorator** (`@Cache`)
   - Declarative caching for GET endpoints
   - Configurable TTL, user-specific caching, query parameter inclusion

4. **InvalidateCache Decorator** (`@InvalidateCache`)
   - Automatic cache invalidation on write operations
   - Supports module-wide, endpoint-specific, and user-specific invalidation

5. **Interceptors**
   - `CacheInterceptor`: Handles caching logic for GET requests
   - `InvalidateCacheInterceptor`: Handles cache invalidation for write operations

## Cache Key Format

Standard format: `{module}:{endpoint}:{params}`

Examples:
- `health:check` - Simple endpoint
- `audit:dashboard:stats` - Module and endpoint
- `user:profile:userId:123` - With user ID
- `queue:stats:page:1:limit:10` - With query parameters
- `cron-jobs:state:type:pledge` - With route parameters

## Implementation Status

### Tier 1: High Priority (✅ Implemented)

#### Health & Monitoring
- ✅ `GET /health` - 30 seconds TTL
- ✅ `GET /queue/monitor/health` - 10 seconds TTL
- ✅ `GET /queue/monitor/metrics` - 15 seconds TTL
- ✅ `GET /queue/monitor/detailed` - 20 seconds TTL
- ✅ `GET /queue/monitor/alerts` - 15 seconds TTL
- ✅ `GET /queue/stats` - 15 seconds TTL
- ✅ `GET /queue/counts` - 10 seconds TTL

#### Statistics & Analytics
- ✅ `GET /audit/dashboard/stats` - 2 minutes TTL
- ✅ `GET /audit/stats` - 1 minute TTL (user-specific)
- ✅ `GET /audit/analytics/usage-stats` - 5 minutes TTL
- ✅ `GET /audit/analytics/hourly-usage` - 5 minutes TTL
- ✅ `GET /audit/analytics/top-endpoints` - 5 minutes TTL
- ✅ `GET /audit/analytics/user-activity` - 3 minutes TTL
- ✅ `GET /audit/dashboard/salesforce-logs/stats` - 2 minutes TTL
- ✅ `GET /errors/stats` - 2 minutes TTL
- ✅ `GET /errors/trends` - 5 minutes TTL
- ✅ `GET /cron-jobs/stats` - 1 minute TTL

#### Reference Data (Static/Semi-Static)
- ✅ `GET /audit/actions` - 1 hour TTL
- ✅ `GET /audit/methods` - 1 hour TTL
- ✅ `GET /audit/status-codes` - 1 hour TTL
- ✅ `GET /audit/salesforce-logs/actions` - 1 hour TTL
- ✅ `GET /audit/salesforce-logs/methods` - 1 hour TTL
- ✅ `GET /audit/salesforce-logs/status-codes` - 1 hour TTL
- ✅ `GET /errors/sources` - 1 hour TTL
- ✅ `GET /errors/types` - 1 hour TTL
- ✅ `GET /errors/environments` - 1 hour TTL
- ✅ `GET /user/roles/available` - 24 hours TTL
- ✅ `GET /cron-jobs/schedules` - 1 hour TTL

#### Settings & Configuration
- ✅ `GET /settings` - 5 minutes TTL
- ✅ `GET /cron-jobs/states` - 30 seconds TTL
- ✅ `GET /cron-jobs/:type/state` - 30 seconds TTL

#### User Profile
- ✅ `GET /user/profile` - 5 minutes TTL (user-specific)

### Tier 2: Medium Priority (✅ Implemented)

- ✅ `GET /queue/performance` - 30 seconds TTL
- ✅ `GET /user/all` - 1 minute TTL (with query params)
- ✅ `GET /user/:id` - 2 minutes TTL
- ✅ `GET /api-key/keys` - 2 minutes TTL (user-specific)
- ✅ `GET /reports` - 1 minute TTL

## Cache Invalidation

### Automatic Invalidation

Write operations automatically invalidate related caches:

- ✅ `PUT /settings` → Invalidates `/settings` cache
- ✅ `PUT /user/profile` → Invalidates user-specific `/user/profile` cache
- ✅ `PUT /cron-jobs/:type/toggle` → Invalidates `/cron-jobs/states` and `/cron-jobs/:type/state` caches
- ✅ `POST /audit/mark-delivered` → Invalidates `/audit/stats` and `/audit/dashboard/stats` caches
- ✅ `POST /api-key/generate` → Invalidates user-specific `/api-key/keys` cache
- ✅ `POST /api-key/revoke` → Invalidates `/api-key/keys` cache
- ✅ `POST /api-key/delete` → Invalidates user-specific `/api-key/keys` cache
- ✅ `POST /api-key/activate` → Invalidates user-specific `/api-key/keys` cache

## Usage Examples

### Adding Cache to a GET Endpoint

```typescript
import { Cache, CacheInterceptor } from '@core/cache';

@Get('stats')
@Cache({ module: 'audit', endpoint: 'stats', ttl: 120000 }) // 2 minutes
@UseInterceptors(CacheInterceptor)
async getStats() {
  return this.auditService.getStats();
}
```

### User-Specific Caching

```typescript
@Get('profile')
@Cache({ 
  module: 'user', 
  endpoint: 'profile', 
  includeUserId: true, 
  ttl: 5 * 60 * 1000 
})
@UseInterceptors(CacheInterceptor)
async getProfile(@Request() req: RequestWithUser) {
  return req.user;
}
```

### Caching with Query Parameters

```typescript
@Get('all')
@Cache({ 
  module: 'user', 
  endpoint: 'all', 
  includeQuery: true, 
  ttl: 60 * 1000 
})
@UseInterceptors(CacheInterceptor)
async getAllUsers(@Query('page') page: number) {
  return this.userService.getAllUsers(page);
}
```

### Cache Invalidation on Write

```typescript
import { InvalidateCache, InvalidateCacheInterceptor } from '@core/cache';

@Put('profile')
@InvalidateCache({ module: 'user', endpoint: 'profile', includeUserId: true })
@UseInterceptors(InvalidateCacheInterceptor)
async updateProfile(@Request() req: RequestWithUser, @Body() data: any) {
  return this.userService.updateProfile(req.user.id, data);
}
```

### Invalidating Multiple Endpoints

```typescript
@Post('mark-delivered')
@InvalidateCache({ module: 'audit', endpoint: 'stats' })
@InvalidateCache({ module: 'audit', endpoint: 'dashboard:stats' })
@UseInterceptors(InvalidateCacheInterceptor)
async markAsDelivered(@Body() body: MarkDeliveredDto) {
  return this.auditService.markAsDelivered(body.jobIds);
}
```

## Configuration

### Environment Variables

- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)
- If Redis is unavailable, the system automatically falls back to in-memory cache

### Cache Module Configuration

Located in `libs/core/cache/cache.module.ts`:
- Default TTL: 5 minutes
- Max items (in-memory): 1000
- Max items (Redis): 10000
- Automatic reconnection with exponential backoff

## Performance Impact

### Expected Improvements

- **Response Time**: 70-90% faster for cached responses
- **Database Load**: 50-80% reduction in queries for cached endpoints
- **Throughput**: Significant increase in requests per second

### Monitoring

Cache hit/miss rates can be monitored by:
1. Adding logging to `CacheService.get()` and `CacheService.set()`
2. Using Redis monitoring tools
3. Adding metrics collection in the interceptors

## Best Practices

1. **TTL Selection**
   - Real-time data: 10-30 seconds
   - Frequently updated: 1-5 minutes
   - Static/semi-static: 1-24 hours

2. **Cache Key Design**
   - Use consistent module and endpoint names
   - Include user ID for user-specific data
   - Include query params when results vary by query

3. **Invalidation Strategy**
   - Invalidate on all write operations
   - Invalidate related endpoints when data changes
   - Use module-wide invalidation sparingly

4. **Error Handling**
   - Cache failures should not break requests
   - System gracefully falls back to direct database queries
   - Log cache errors for monitoring

## Troubleshooting

### Cache Not Working

1. Check Redis connection: `redis-cli ping`
2. Verify `REDIS_URL` environment variable
3. Check cache module is imported in `CoreModule`
4. Verify interceptors are applied to endpoints

### Stale Data

1. Check TTL values are appropriate
2. Verify cache invalidation is working on write operations
3. Consider reducing TTL for frequently changing data

### Memory Issues

1. Monitor Redis memory usage
2. Adjust `max` items in cache configuration
3. Implement cache eviction policies

## Future Enhancements

- [ ] Cache warming on application startup
- [ ] Cache statistics and monitoring dashboard
- [ ] Distributed cache invalidation for multi-instance deployments
- [ ] Cache compression for large responses
- [ ] Cache versioning for breaking changes

