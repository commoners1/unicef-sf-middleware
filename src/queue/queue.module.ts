// src/queue/queue.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SalesforceProcessor } from './processors/salesforce.processor';
import { EmailProcessor } from './processors/email.processor';
import { QueueService } from './services/queue.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import { QueueMonitorService } from './services/queue-monitor.service';
import { BatchProcessorService } from './services/batch-processor.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { QueueMonitorController } from './controllers/queue-monitor.controller';
import { JobManagementController } from './controllers/job-management.controller';
import { PrismaService } from '@infra/prisma.service';
import { SalesforceService } from '../salesforce/salesforce.service';
import { AuditModule } from '../audit/audit.module';
import { CronJobsModule } from '../cron-jobs/cron-jobs.module';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => CronJobsModule),
    // Salesforce Queue - High Performance Configuration
    BullModule.registerQueueAsync({
      name: 'salesforce',
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: {
          url: cs.get<string>('REDIS_URL')!,
          // High-performance Redis settings
          retryDelayOnFailover: 50,
          lazyConnect: true,
        },
        defaultJobOptions: {
          removeOnComplete: 5000, // Keep more for monitoring
          removeOnFail: 2000, // Keep failed jobs for debugging
          attempts: 2, // Faster failure for high volume
          backoff: {
            type: 'exponential',
            delay: 500, // Faster retry
          },
          // High-performance settings
          delay: 0,
          priority: 0,
        },
      }),
    }),
    // Email Queue
    BullModule.registerQueueAsync({
      name: 'email',
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: { url: cs.get<string>('REDIS_URL')! },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        },
      }),
    }),
    // Notification Queue
    BullModule.registerQueueAsync({
      name: 'notifications',
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: { url: cs.get<string>('REDIS_URL')! },
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
    }),
  ],
  controllers: [QueueMonitorController, JobManagementController],
  providers: [
    SalesforceProcessor,
    EmailProcessor,
    QueueService,
    JobSchedulerService,
    QueueMonitorService,
    BatchProcessorService,
    PerformanceMonitorService,
    PrismaService,
    SalesforceService,
  ],
  exports: [
    QueueService,
    JobSchedulerService,
    QueueMonitorService,
    BatchProcessorService,
    PerformanceMonitorService,
  ],
})
export class QueueModule {}
