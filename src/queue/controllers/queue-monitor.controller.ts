// src/queue/controllers/queue-monitor.controller.ts
import { Controller, Get, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { QueueMonitorService } from '../services/queue-monitor.service';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { BatchProcessorService } from '../services/batch-processor.service';
import { SalesforceProcessor } from '../processors/salesforce.processor';
import { Cache, CacheInterceptor } from '@core/cache';

@Controller('queue/monitor')
@UseGuards(JwtAuthGuard)
export class QueueMonitorController {
  constructor(
    private readonly queueMonitor: QueueMonitorService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly batchProcessor: BatchProcessorService,
    private readonly salesforceProcessor: SalesforceProcessor,
  ) {}

  @Get('health')
  @Cache({ module: 'queue', endpoint: 'monitor:health', ttl: 10 * 1000 }) // 10 seconds
  @UseInterceptors(CacheInterceptor)
  async getHealth() {
    const [queueStats, performance, batchStats, processorMetrics] =
      await Promise.all([
        this.queueMonitor.getQueueStats(),
        this.performanceMonitor.getMetrics(),
        this.batchProcessor.getBatchStats(),
        this.salesforceProcessor.getProcessorMetrics(),
      ]);

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queues: queueStats,
      performance,
      batch: batchStats,
      processor: processorMetrics,
    };
  }

  @Get('detailed')
  @Cache({ module: 'queue', endpoint: 'monitor:detailed', ttl: 20 * 1000 }) // 20 seconds
  @UseInterceptors(CacheInterceptor)
  async getDetailedStats() {
    return await this.performanceMonitor.getDetailedStats();
  }

  @Get('metrics')
  @Cache({ module: 'queue', endpoint: 'monitor:metrics', ttl: 15 * 1000 }) // 15 seconds
  @UseInterceptors(CacheInterceptor)
  async getMetrics() {
    return await this.performanceMonitor.getMetrics();
  }

  @Post('force-flush')
  async forceFlushBatch() {
    await this.batchProcessor.forceFlush();
    return {
      message: 'Batch flush completed',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('alerts')
  @Cache({ module: 'queue', endpoint: 'monitor:alerts', ttl: 15 * 1000 }) // 15 seconds
  @UseInterceptors(CacheInterceptor)
  async getAlerts() {
    const stats = await this.performanceMonitor.getDetailedStats();
    return {
      alerts: stats.alerts,
      timestamp: new Date().toISOString(),
    };
  }
}
