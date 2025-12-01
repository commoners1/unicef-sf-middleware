import { Queue, JobsOptions } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  SalesforceJobData,
  EmailJobData,
  NotificationJobData,
  JobOptions,
} from '@localTypes/queue.types';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('salesforce') private salesforceQueue: Queue,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async addSalesforceJob(data: SalesforceJobData, options?: JobOptions) {
    const jobOptions: JobsOptions = {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: options?.attempts,
      backoff: options?.backoff,
    };

    const job = await this.salesforceQueue.add(
      'process-salesforce',
      data,
      jobOptions,
    );

    this.logger.log(`Added Salesforce job ${job.id}`);
    return job;
  }

  async addEmailJob(data: EmailJobData, options?: JobOptions) {
    const jobOptions: JobsOptions = {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: options?.attempts,
      backoff: options?.backoff,
    };

    const job = await this.emailQueue.add('send-email', data, jobOptions);

    this.logger.log(`Added email job ${job.id}`);
    return job;
  }

  async addNotificationJob(data: NotificationJobData, options?: JobOptions) {
    const jobOptions: JobsOptions = {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      attempts: options?.attempts,
      backoff: options?.backoff,
    };

    const job = await this.notificationsQueue.add(
      'send-notification',
      data,
      jobOptions,
    );

    this.logger.log(`Added notification job ${job.id}`);
    return job;
  }

  async getQueueStats() {
    const [salesforce, email, notifications] = await Promise.all([
      this.salesforceQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
      this.notificationsQueue.getJobCounts(),
    ]);

    return {
      salesforce,
      email,
      notifications,
    };
  }
}
