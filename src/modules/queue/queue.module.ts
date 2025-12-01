import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infra/database/prisma.service';
import { QueueMonitorController } from '@modules/queue/controllers/queue-monitor.controller';
import { JobManagementController } from '@modules/queue/controllers/job-management.controller';
import { EmailProcessor } from '@modules/queue/processors/email.processor';
import { SalesforceProcessor } from '@modules/queue/processors/salesforce.processor';
import { NotificationProcessor } from '@modules/queue/processors/notification.processor';
import { QueueService } from '@modules/queue/services/queue.service';
import { JobSchedulerService } from '@modules/queue/services/job-scheduler.service';
import { QueueMonitorService } from '@modules/queue/services/queue-monitor.service';
import { BatchProcessorService } from '@modules/queue/services/batch-processor.service';
import { PerformanceMonitorService } from '@modules/queue/services/performance-monitor.service';
import { AuthModule } from '@modules/auth/auth.module';
import { AuditModule } from '@modules/audit/audit.module';
import { CronJobsModule } from '@modules/cron-jobs/cron-jobs.module';
import { SalesforceService } from '@modules/salesforce/services/salesforce.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    forwardRef(() => CronJobsModule),
    BullModule.registerQueueAsync({
      name: 'salesforce',
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: {
          url: cs.get<string>('REDIS_URL')!,
          retryDelayOnFailover: 50,
          lazyConnect: true,
        },
        defaultJobOptions: {
          removeOnComplete: 5000,
          removeOnFail: 2000,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 500,
          },
          delay: 0,
          priority: 0,
        },
      }),
    }),
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
    NotificationProcessor,
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
