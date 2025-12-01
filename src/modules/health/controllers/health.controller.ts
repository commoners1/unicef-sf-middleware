import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { Cache, CacheInterceptor } from '@infra/cache';

@Controller()
export class HealthController {
  @Get('health')
  @Cache({ module: 'health', endpoint: 'check', ttl: 30 * 1000 })
  @UseInterceptors(CacheInterceptor)
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Salesforce Middleware is running',
    };
  }
}
