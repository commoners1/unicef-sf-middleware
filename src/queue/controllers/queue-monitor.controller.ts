// src/queue/controllers/queue-monitor.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { QueueMonitorService } from '../services/queue-monitor.service';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { BatchProcessorService } from '../services/batch-processor.service';
import { SalesforceProcessor } from '../processors/salesforce.processor';

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
  async getDetailedStats() {
    return await this.performanceMonitor.getDetailedStats();
  }

  @Get('metrics')
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
  async getAlerts() {
    const stats = await this.performanceMonitor.getDetailedStats();
    return {
      alerts: stats.alerts,
      timestamp: new Date().toISOString(),
    };
  }
}
