// src/queue/processors/notification.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { StructuredLogger } from '@core/logging/structured-logger.util';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly structuredLogger = new StructuredLogger(this.logger);

  constructor() {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const startTime = Date.now();
    const { type, userId, message, data } = job.data;

    this.structuredLogger.jobStart(job.id?.toString() || 'unknown', {
      type,
      userId,
    });

    try {
      const result = await this.sendNotification(type, userId, message, data);

      const processingTime = Date.now() - startTime;
      this.structuredLogger.jobComplete(
        job.id?.toString() || 'unknown',
        processingTime,
        {
          type,
          userId,
          notificationId: result.notificationId,
        },
      );
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.structuredLogger.jobFailed(
        job.id?.toString() || 'unknown',
        error,
        processingTime,
        {
          type,
          userId,
        },
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.structuredLogger.jobComplete(job.id?.toString() || 'unknown', 0, {
      event: 'worker_completed',
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.structuredLogger.jobFailed(job.id?.toString() || 'unknown', err, 0, {
      event: 'worker_failed',
    });
  }

  private sendNotification(
    type: string,
    userId: string,
    message: string,
    _data: any,
  ) {
    // Implement your notification logic (push, SMS, etc.)
    this.structuredLogger.info('Sending notification', {
      type,
      userId,
      message,
    });
    return Promise.resolve({
      success: true,
      notificationId: `notif_${Date.now()}`,
    });
  }
}
