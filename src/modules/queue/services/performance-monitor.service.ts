import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { StructuredLogger } from '@core/logging/structured-logger.util';

export interface PerformanceMetrics {
  jobsPerSecond: number;
  queueDepth: number;
  errorRate: number;
  avgProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: Date;
}

interface AlertThresholds {
  queueDepth: number;
  errorRate: number;
  processingTime: number;
  memoryUsage: number;
  jobsPerSecond: number;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly structuredLogger = new StructuredLogger(this.logger);
  private metrics: PerformanceMetrics;
  private alertThresholds: AlertThresholds;
  private lastJobCount = 0;
  private lastTimestamp = Date.now();

  constructor(
    @InjectQueue('salesforce') private salesforceQueue: Queue,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {
    this.alertThresholds = {
      queueDepth: 5000, // Alert if >5k jobs waiting
      errorRate: 0.05, // Alert if >5% error rate
      processingTime: 10000, // Alert if >10s avg processing
      memoryUsage: 0.8, // Alert if >80% memory usage
      jobsPerSecond: 50, // Alert if >50 jobs/second
    };

    this.metrics = {
      jobsPerSecond: 0,
      queueDepth: 0,
      errorRate: 0,
      avgProcessingTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      timestamp: new Date(),
    };

    // Start monitoring
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Update metrics every 30 seconds
    setInterval(async () => {
      await this.updateMetrics();
      await this.checkAlerts();
    }, 30000);

    // Log performance every 5 minutes
    setInterval(() => {
      this.logPerformanceMetrics();
    }, 300000);
  }

  private async updateMetrics(): Promise<void> {
    try {
      const [salesforce, email, notifications] = await Promise.all([
        this.salesforceQueue.getJobCounts(),
        this.emailQueue.getJobCounts(),
        this.notificationsQueue.getJobCounts(),
      ]);

      const totalJobs =
        salesforce.completed +
        salesforce.failed +
        email.completed +
        email.failed +
        notifications.completed +
        notifications.failed;

      const currentTime = Date.now();
      const timeDiff = (currentTime - this.lastTimestamp) / 1000;
      const jobDiff = totalJobs - this.lastJobCount;

      this.metrics.jobsPerSecond = jobDiff / timeDiff;
      this.metrics.queueDepth =
        salesforce.waiting + email.waiting + notifications.waiting;
      this.metrics.errorRate = this.calculateErrorRate(
        salesforce,
        email,
        notifications,
      );
      this.metrics.avgProcessingTime = await this.calculateAvgProcessingTime();
      this.metrics.memoryUsage = this.getMemoryUsage();
      this.metrics.cpuUsage = this.getCpuUsage();
      this.metrics.timestamp = new Date();

      this.lastJobCount = totalJobs;
      this.lastTimestamp = currentTime;
    } catch (error) {
      this.structuredLogger.error('Failed to update metrics', error, {
        source: 'performance_monitor',
      });
    }
  }

  private calculateErrorRate(
    salesforce: any,
    email: any,
    notifications: any,
  ): number {
    const totalCompleted =
      salesforce.completed + email.completed + notifications.completed;
    const totalFailed = salesforce.failed + email.failed + notifications.failed;
    const total = totalCompleted + totalFailed;

    return total > 0 ? totalFailed / total : 0;
  }

  private async calculateAvgProcessingTime(): Promise<number> {
    try {
      // Get recent completed jobs to calculate average processing time
      const recentJobs = await this.salesforceQueue.getCompleted(0, 100);
      if (recentJobs.length === 0) return 0;

      const totalTime = recentJobs.reduce((sum, job) => {
        const processingTime = (job.processedOn || 0) - job.timestamp;
        return sum + processingTime;
      }, 0);

      return totalTime / recentJobs.length;
    } catch (error) {
      this.structuredLogger.error(
        'Failed to calculate avg processing time',
        error,
        {
          source: 'performance_monitor',
        },
      );
      return 0;
    }
  }

  private getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / memUsage.heapTotal;
  }

  private getCpuUsage(): number {
    const cpus = require('os').cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu: { times: Record<string, number> }) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 1 - totalIdle / totalTick;
  }

  private async checkAlerts(): Promise<void> {
    // Compute percentages outside logger calls
    const errorRatePercent = this.metrics.errorRate * 100;
    const memoryUsagePercent = this.metrics.memoryUsage * 100;
    const jobsPerSecondFormatted = Number(
      this.metrics.jobsPerSecond.toFixed(2),
    );

    if (this.metrics.queueDepth > this.alertThresholds.queueDepth) {
      this.structuredLogger.alert(
        'HIGH_QUEUE_DEPTH',
        `Queue depth: ${this.metrics.queueDepth} jobs waiting`,
        'WARNING',
        {
          queueDepth: this.metrics.queueDepth,
          threshold: this.alertThresholds.queueDepth,
        },
      );
    }

    if (this.metrics.errorRate > this.alertThresholds.errorRate) {
      this.structuredLogger.alert(
        'HIGH_ERROR_RATE',
        `Error rate: ${errorRatePercent.toFixed(2)}%`,
        'CRITICAL',
        {
          errorRate: Number(errorRatePercent.toFixed(2)),
          threshold: this.alertThresholds.errorRate * 100,
        },
      );
    }

    if (this.metrics.avgProcessingTime > this.alertThresholds.processingTime) {
      this.structuredLogger.alert(
        'SLOW_PROCESSING',
        `Avg processing time: ${this.metrics.avgProcessingTime.toFixed(2)}ms`,
        'WARNING',
        {
          avgProcessingTime: Number(this.metrics.avgProcessingTime.toFixed(2)),
          threshold: this.alertThresholds.processingTime,
        },
      );
    }

    if (this.metrics.memoryUsage > this.alertThresholds.memoryUsage) {
      this.structuredLogger.alert(
        'HIGH_MEMORY_USAGE',
        `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        'WARNING',
        {
          memoryUsage: Number(memoryUsagePercent.toFixed(2)),
          threshold: this.alertThresholds.memoryUsage * 100,
        },
      );
    }

    if (this.metrics.jobsPerSecond > this.alertThresholds.jobsPerSecond) {
      // High throughput is informational, not concerning
      this.structuredLogger.info('High throughput detected', {
        jobsPerSecond: jobsPerSecondFormatted,
        threshold: this.alertThresholds.jobsPerSecond,
      });
    }
  }

  private logPerformanceMetrics(): void {
    // Compute all metrics outside logger call
    const errorRatePercent = this.metrics.errorRate * 100;
    const memoryUsagePercent = this.metrics.memoryUsage * 100;
    const cpuUsagePercent = this.metrics.cpuUsage * 100;

    this.structuredLogger.metrics({
      source: 'performance_monitor',
      jobsPerSecond: Number(this.metrics.jobsPerSecond.toFixed(2)),
      queueDepth: this.metrics.queueDepth,
      errorRate: Number(errorRatePercent.toFixed(2)),
      avgProcessingTime: Number(this.metrics.avgProcessingTime.toFixed(2)),
      memoryUsage: Number(memoryUsagePercent.toFixed(2)),
      cpuUsage: Number(cpuUsagePercent.toFixed(2)),
    });
  }

  getMetrics(): PerformanceMetrics {
    return this.metrics;
  }

  async getDetailedStats() {
    const [salesforce, email, notifications] = await Promise.all([
      this.salesforceQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
      this.notificationsQueue.getJobCounts(),
    ]);

    return {
      queues: {
        salesforce: {
          ...salesforce,
          avgProcessingTime: await this.calculateAvgProcessingTime(),
        },
        email,
        notifications,
      },
      performance: this.metrics,
      alerts: await this.getActiveAlerts(),
    };
  }

  private async getActiveAlerts() {
    const alerts: Array<{ type: string; message: string }> = [];

    if (this.metrics.queueDepth > this.alertThresholds.queueDepth) {
      alerts.push({
        type: 'HIGH_QUEUE_DEPTH',
        message: `${this.metrics.queueDepth} jobs waiting`,
      });
    }

    if (this.metrics.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        message: `${(this.metrics.errorRate * 100).toFixed(2)}% error rate`,
      });
    }

    return alerts;
  }
}
