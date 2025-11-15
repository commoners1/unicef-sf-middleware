// src/queue/processors/email.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor() {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { to, subject, body, template } = job.data;

    this.logger.log(`Processing email job ${job.id} to ${to}`);

    try {
      // Implement email sending logic here
      // You can use nodemailer, sendgrid, etc.
      const result = await this.sendEmail(to, subject, body, template);

      this.logger.log(`Email job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Email job ${job.id} failed:`, err);
  }

  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    template?: string,
  ) {
    // Implement your email sending logic
    console.log(`Sending email to ${to}: ${subject}`);
    return { success: true, messageId: `msg_${Date.now()}` };
  }
}
