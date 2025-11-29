// src/health.controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { Cache } from '@core/cache';
import { CacheInterceptor } from '@core/cache';

@Controller()
export class HealthController {
  @Get('health')
  @Cache({ module: 'health', endpoint: 'check', ttl: 30 * 1000 }) // 30 seconds
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
