// libs/core/cache/cache.module.ts
import { Global, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          // Fallback to in-memory cache if Redis is not configured
          return {
            ttl: 5 * 60 * 1000, // 5 minutes default
            max: 1000, // Maximum number of items in cache
          };
        }

        try {
          const store = await redisStore({
            url: redisUrl,
            ttl: 5 * 60 * 1000, // 5 minutes default TTL
            socket: {
              reconnectStrategy: (retries: number) => {
                if (retries > 10) {
                  return new Error('Too many retries');
                }
                return Math.min(retries * 100, 3000);
              },
            },
          });

          return {
            store: () => store,
            ttl: 5 * 60 * 1000, // 5 minutes default
            max: 10000, // Maximum number of items in cache
          };
        } catch (error) {
          console.warn(
            'Failed to connect to Redis, falling back to in-memory cache:',
            error,
          );
          // Fallback to in-memory cache
          return {
            ttl: 5 * 60 * 1000,
            max: 1000,
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
