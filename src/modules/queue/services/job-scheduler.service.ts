import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma.service';
import { SalesforceConfigService } from '@core/config/salesforce-config.service';
import { QueueService } from '@modules/queue/services/queue.service';
import { SalesforceService } from '@modules/salesforce/services/salesforce.service';
import { AuditService } from '@modules/audit/services/audit.service';
import { CronJobStateService } from '@modules/cron-jobs/services/cron-job-state.service';

@Injectable()
export class JobSchedulerService {
  private readonly logger = new Logger(JobSchedulerService.name);
  private static readonly FIVE_MINUTES_MS = 300000;
  private isRunning = new Map<string, boolean>(); // Prevent overlapping executions
  private readonly endpoints: ReturnType<
    SalesforceConfigService['getEndpoints']
  >;

  constructor(
    private readonly queueService: QueueService,
    private readonly salesforceService: SalesforceService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly salesforceConfig: SalesforceConfigService,
    @Inject(forwardRef(() => CronJobStateService))
    private readonly cronJobStateService?: CronJobStateService,
  ) {
    this.endpoints = this.salesforceConfig.getEndpoints();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduleRecurringJobs() {
    // Check if job is enabled
    if (
      this.cronJobStateService &&
      !this.cronJobStateService.isJobEnabled('recurring')
    ) {
      this.logger.debug('Recurring jobs are disabled, skipping...');
      return;
    }

    const jobId = 'recurring-cleanup';
    if (this.isRunning.get(jobId)) {
      this.logger.warn('Schedule recurring jobs already running, skipping...');
      return;
    }

    this.isRunning.set(jobId, true);
    const startTime = Date.now();

    try {
      this.logger.log('Scheduling recurring jobs...');

      // Schedule cleanup jobs as notification type
      await this.queueService.addNotificationJob(
        { type: 'cleanup', timestamp: new Date() },
        { delay: JobSchedulerService.FIVE_MINUTES_MS },
      );

      const duration = Date.now() - startTime;

      // Log job scheduling
      await this.auditService.logJobScheduling(
        null,
        null,
        'cleanup',
        'system',
        'cron',
        { type: 'cleanup', timestamp: new Date() },
        true,
      );

      this.logger.log(`Recurring jobs scheduled successfully in ${duration}ms`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to schedule recurring jobs:', error);

      // Log failed scheduling
      await this.auditService.logJobScheduling(
        null,
        null,
        'cleanup',
        'system',
        'cron',
        { type: 'cleanup', timestamp: new Date() },
        false,
        errorMessage,
      );
    } finally {
      this.isRunning.set(jobId, false);
    }
  }

  @Cron('*/2 * * * *')
  async schedulePledgeJobs() {
    // Check if job is enabled
    if (
      this.cronJobStateService &&
      !this.cronJobStateService.isJobEnabled('pledge')
    ) {
      this.logger.debug('Pledge jobs are disabled, skipping...');
      return;
    }

    const jobId = 'pledge-jobs';
    if (this.isRunning.get(jobId)) {
      this.logger.warn('Schedule pledge jobs already running, skipping...');
      return;
    }

    this.isRunning.set(jobId, true);
    const startTime = Date.now();

    try {
      this.logger.log('Scheduling pledge jobs...');

      // Get fresh token for this batch
      const tokenResult = await this.salesforceService.getToken();
      if (!tokenResult.success || !tokenResult.tokenResponse?.access_token) {
        throw new Error('Failed to retrieve access token');
      }

      const auditId = `pledge-${Date.now()}`;
      const jobData = {
        endpoint: this.endpoints.ENDPOINTS.PLEDGE_API,
        payload: null,
        token: tokenResult.tokenResponse.access_token,
        type: 'pledge',
        clientId: this.configService.getOrThrow<string>('SF_CLIENT_ID'),
        auditId,
      };

      // Create JobAudit record before queueing
      await this.prisma.jobAudit.create({
        data: {
          idempotencyKey: auditId,
          payload: jobData,
          status: 'queued',
          attempts: 0,
        },
      });

      await this.queueService.addSalesforceJob(jobData, {
        priority: 1,
        attempts: 3,
      });

      const duration = Date.now() - startTime;

      // Log job scheduling with isDelivered=false for cron jobs
      await this.auditService.logJobScheduling(
        null,
        null,
        'pledge',
        this.endpoints.ENDPOINTS.PLEDGE_API,
        'cron',
        { ...jobData, duration },
        true,
        undefined,
        true, // isDelivered = false for cron jobs
      );

      this.logger.log(
        `Scheduled pledge jobs successfully at ${new Date().toISOString()} in ${duration}ms`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to schedule pledge jobs:', error);

      // Log failed scheduling - Fixed: using PLEDGE_API instead of PLEDGE
      await this.auditService.logJobScheduling(
        null,
        null,
        'pledge',
        this.endpoints.ENDPOINTS.PLEDGE_API,
        'cron',
        { endpoint: this.endpoints.ENDPOINTS.PLEDGE_API },
        false,
        errorMessage,
        true,
      );
    } finally {
      this.isRunning.set(jobId, false);
    }
  }

  @Cron('*/2 * * * *')
  async scheduleOneOffJobs() {
    // Check if job is enabled
    if (
      this.cronJobStateService &&
      !this.cronJobStateService.isJobEnabled('oneoff')
    ) {
      this.logger.debug('One-off jobs are disabled, skipping...');
      return;
    }

    const jobId = 'oneoff-jobs';
    if (this.isRunning.get(jobId)) {
      this.logger.warn('Schedule one off jobs already running, skipping...');
      return;
    }

    this.isRunning.set(jobId, true);
    const startTime = Date.now();

    try {
      this.logger.log('Scheduling one off jobs...');

      // Get fresh token for this batch
      const tokenResult = await this.salesforceService.getToken();
      if (!tokenResult.success || !tokenResult.tokenResponse?.access_token) {
        throw new Error('Failed to retrieve access token');
      }

      const auditId = `oneOffJob-${Date.now()}`;
      const jobData = {
        endpoint: this.endpoints.ENDPOINTS.ONEOFF_API,
        payload: null,
        token: tokenResult.tokenResponse.access_token,
        type: 'oneoff',
        clientId: this.configService.getOrThrow<string>('SF_CLIENT_ID'),
        auditId,
      };

      // Create JobAudit record before queueing
      await this.prisma.jobAudit.create({
        data: {
          idempotencyKey: auditId,
          payload: jobData,
          status: 'queued',
          attempts: 0,
        },
      });

      await this.queueService.addSalesforceJob(jobData, {
        priority: 1,
        attempts: 3,
      });

      const duration = Date.now() - startTime;

      // Log job scheduling with isDelivered=false for cron jobs
      await this.auditService.logJobScheduling(
        null,
        null,
        'oneoff',
        this.endpoints.ENDPOINTS.ONEOFF_API,
        'cron',
        { ...jobData, duration },
        true,
        undefined,
        true,
      );

      this.logger.log(
        `Scheduled one off jobs successfully at ${new Date().toISOString()} in ${duration}ms`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to schedule one off jobs:', error);

      // Log failed scheduling
      await this.auditService.logJobScheduling(
        null,
        null,
        'oneoff',
        this.endpoints.ENDPOINTS.ONEOFF_API,
        'cron',
        { endpoint: this.endpoints.ENDPOINTS.ONEOFF_API },
        false,
        errorMessage,
        true,
      );
    } finally {
      this.isRunning.set(jobId, false);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleHourlyJobs() {
    // Check if job is enabled
    if (
      this.cronJobStateService &&
      !this.cronJobStateService.isJobEnabled('hourly')
    ) {
      this.logger.debug('Hourly jobs are disabled, skipping...');
      return;
    }

    const jobId = 'hourly-jobs';
    if (this.isRunning.get(jobId)) {
      this.logger.warn('Schedule hourly jobs already running, skipping...');
      return;
    }

    this.isRunning.set(jobId, true);
    const startTime = Date.now();

    try {
      this.logger.log('Scheduling hourly jobs...');

      // Schedule reports
      await this.queueService.addNotificationJob(
        { type: 'hourly-report', timestamp: new Date() },
        { priority: 1 },
      );

      const duration = Date.now() - startTime;

      // Log job scheduling
      await this.auditService.logJobScheduling(
        null,
        null,
        'hourly-report',
        'notifications',
        'cron',
        { type: 'hourly-report', timestamp: new Date(), duration },
        true,
      );

      this.logger.log(`Hourly jobs scheduled successfully in ${duration}ms`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to schedule hourly jobs:', error);

      // Log failed scheduling
      await this.auditService.logJobScheduling(
        null,
        null,
        'hourly-report',
        'notifications',
        'cron',
        { type: 'hourly-report', timestamp: new Date() },
        false,
        errorMessage,
      );
    } finally {
      this.isRunning.set(jobId, false);
    }
  }
}
