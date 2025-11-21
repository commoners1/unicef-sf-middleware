// src/queue/processors/notification.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor() {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { type, userId, message, data } = job.data;

    this.logger.log(`Processing notification job ${job.id} for user ${userId}`);

    try {
      const result = await this.sendNotification(type, userId, message, data);

      this.logger.log(`Notification job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Notification job ${job.id} failed:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Notification job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Notification job ${job.id} failed:`, err);
  }

  private async sendNotification(
    type: string,
    userId: string,
    message: string,
    data: any,
  ) {
    // Implement your notification logic (push, SMS, etc.)
    this.logger.log(`Sending ${type} notification to user ${userId}: ${message}`);
    return { success: true, notificationId: `notif_${Date.now()}` };
  }
}
