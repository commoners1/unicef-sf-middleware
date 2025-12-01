// libs/core/utils/redis.config.ts
import { ConfigService } from '@nestjs/config';

export interface RedisConfig {
  url: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  // High-performance settings
  keepAlive: boolean;
  connectTimeout: number;
  commandTimeout: number;
  // Connection pooling
  maxConnections: number;
  minConnections: number;
}

export function getHighPerformanceRedisConfig(
  configService: ConfigService,
): RedisConfig {
  return {
    url: configService.get<string>('REDIS_URL')!,
    retryDelayOnFailover: 50,
    maxRetriesPerRequest: 5,
    lazyConnect: true,
    keepAlive: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    maxConnections: 20,
    minConnections: 5,
  };
}

export function getRedisClusterConfig(configService: ConfigService) {
  return {
    cluster: {
      nodes: [
        {
          host: configService.get<string>('REDIS_HOST_1') || 'localhost',
          port: 6379,
        },
        {
          host: configService.get<string>('REDIS_HOST_2') || 'localhost',
          port: 6379,
        },
        {
          host: configService.get<string>('REDIS_HOST_3') || 'localhost',
          port: 6379,
        },
      ],
      redisOptions: {
        retryDelayOnFailover: 50,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      },
    },
    // High-performance settings
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 50,
    lazyConnect: true,
  };
}
