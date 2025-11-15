// src/queue/services/batch-processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';
import { Prisma } from '@prisma/client';

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
      this.logger.log(
        `Batch processed ${updates.length} job updates in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Batch update failed:`, error);

      // Re-queue failed updates for retry
      this.pendingUpdates.unshift(...updates);

      // If we have too many pending updates, log warning
      if (this.pendingUpdates.length > this.batchSize * 2) {
        this.logger.warn(
          `High pending updates count: ${this.pendingUpdates.length}`,
        );
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
      this.logger.log(
        `Flushing ${this.pendingUpdates.length} remaining updates...`,
      );
      await this.flushBatch();
    }
  }
}
