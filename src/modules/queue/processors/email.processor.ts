// src/queue/processors/email.processor.ts
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { StructuredLogger } from '@core/logging/structured-logger.util';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly structuredLogger = new StructuredLogger(this.logger);

  constructor() {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const startTime = Date.now();
    const { to, subject, body, template } = job.data;

    this.structuredLogger.jobStart(job.id?.toString() || 'unknown', {
      to,
      subject,
      template,
    });

    try {
      // Implement email sending logic here
      // You can use nodemailer, sendgrid, etc.
      const result = await this.sendEmail(to, subject, body, template);

      const processingTime = Date.now() - startTime;
      this.structuredLogger.jobComplete(
        job.id?.toString() || 'unknown',
        processingTime,
        {
          to,
          messageId: result.messageId,
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
          to,
          subject,
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

  private sendEmail(
    to: string,
    subject: string,
    body: string,
    template?: string,
  ) {
    // Implement your email sending logic
    this.structuredLogger.info('Sending email', {
      to,
      subject,
      template,
    });
    return Promise.resolve({ success: true, messageId: `msg_${Date.now()}` });
  }
}
