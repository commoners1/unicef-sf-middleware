// src/queue/services/batch-processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';
import { Prisma } from '@prisma/client';
import { StructuredLogger } from '@core/utils/structured-logger.util';

interface JobUpdate {
  auditId: string;
  status: string;
  result?: Record<string, unknown> | null;
  error?: string;
  processingTime?: number;
}

@Injectable()
export class BatchProcessorService {
  private readonly logger = new Logger(BatchProcessorService.name);
  private readonly structuredLogger = new StructuredLogger(this.logger);
  private readonly batchSize = 100;
  private readonly batchTimeout = 5000; // 5 seconds
  private pendingUpdates: JobUpdate[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Start batch processing timer
    this.startBatchTimer();
  }

  async updateJobStatus(
    auditId: string,
    status: string,
    result?: Record<string, unknown> | null,
    error?: string,
    processingTime?: number,
  ): Promise<void> {
    this.pendingUpdates.push({
      auditId,
      status,
      result,
      error,
      processingTime,
    });

    // Flush immediately if batch is full
    if (this.pendingUpdates.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      if (this.pendingUpdates.length > 0) {
        void this.flushBatch();
      }
    }, this.batchTimeout);
  }

  private async flushBatch(): Promise<void> {
    if (this.pendingUpdates.length === 0) return;

    const updates = this.pendingUpdates.splice(0);
    const startTime = Date.now();

    try {
      // Batch database update using transaction
      await this.prisma.$transaction(
        updates.map((update) =>
          this.prisma.jobAudit.update({
            where: { idempotencyKey: update.auditId }, // Use idempotencyKey to match auditId
            data: {
              status: update.status,
              sfResponse: update.result
                ? (update.result as Prisma.InputJsonValue)
                : undefined,
              errorMessage: update.error,
              attempts: { increment: 1 },
              updatedAt: new Date(),
            },
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.structuredLogger.batch('job_updates', updates.length, duration, {
        batchSize: this.batchSize,
      });
    } catch (error) {
      this.structuredLogger.error('Batch update failed', error, {
        operation: 'batch_job_updates',
        batchSize: updates.length,
      });

      // Re-queue failed updates for retry
      this.pendingUpdates.unshift(...updates);

      // If we have too many pending updates, log warning
      if (this.pendingUpdates.length > this.batchSize * 2) {
        this.structuredLogger.warn('High pending updates count', {
          pendingUpdates: this.pendingUpdates.length,
          threshold: this.batchSize * 2,
        });
      }
    }
  }

  getBatchStats() {
    return {
      pendingUpdates: this.pendingUpdates.length,
      batchSize: this.batchSize,
      batchTimeout: this.batchTimeout,
    };
  }

  async forceFlush(): Promise<void> {
    await this.flushBatch();
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    // Flush any remaining updates
    if (this.pendingUpdates.length > 0) {
      this.structuredLogger.info('Flushing remaining updates on shutdown', {
        pendingUpdates: this.pendingUpdates.length,
        operation: 'shutdown',
      });
      await this.flushBatch();
    }
  }
}
