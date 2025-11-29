import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';
import { JobSchedulerService } from '../queue/services/job-scheduler.service';
import { CronJobStateService } from './cron-job-state.service';
import { DateUtil } from '@core/utils/date.util';

export interface CronJobInfo {
  id: string;
  name: string;
  description: string;
  schedule: string;
  nextRun: string;
  lastRun: string | null;
  status: 'active' | 'paused' | 'error';
  isEnabled: boolean;
  duration: number | null;
  successCount: number;
  failureCount: number;
  lastStatus: 'success' | 'failed' | 'running' | null;
  lastStatusMessage: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface CronJobStats {
  total: number;
  active: number;
  paused: number;
  error: number;
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  last24Hours: number;
}

export interface CronJobHistory {
  id: string;
  jobId: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  message: string | null;
  error: string | null;
}

// Job type mapping
const JOB_TYPE_MAP = {
  'pledge': 'schedulePledgeJobs',
  'oneoff': 'scheduleOneOffJobs',
  'recurring': 'scheduleRecurringJobs',
  'hourly': 'scheduleHourlyJobs',
} as const;

@Injectable()
export class CronJobsService {
  private readonly logger = new Logger(CronJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobSchedulerService: JobSchedulerService,
    private readonly cronJobStateService: CronJobStateService,
  ) {}

  async getCronJobs(filters: {
    page: number;
    limit: number;
    status?: string;
    type?: string;
  }) {
    const { page, limit, status, type } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      action: 'CRON_JOB',
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          apiKey: {
            select: { name: true, description: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Transform audit logs to cron job format
    const cronJobs: CronJobInfo[] = jobs.map((job: any) => {
      const schedule = this.getScheduleFromType(job.type || 'unknown');
      
      return {
        id: job.id,
        name: this.getJobName(job.type || 'unknown'),
        description: this.getJobDescription(job.type || 'unknown'),
        schedule,
        nextRun: this.calculateNextRun(schedule),
        lastRun: job.createdAt.toISOString(),
        status: job.statusCode === 200 ? 'active' : 'error',
        isEnabled: true, // All cron jobs are enabled by default
        duration: job.duration || null,
        successCount: job.statusCode === 200 ? 1 : 0,
        failureCount: job.statusCode !== 200 ? 1 : 0,
        lastStatus: job.statusCode === 200 ? 'success' : 'failed',
        lastStatusMessage: job.responseData ? JSON.stringify(job.responseData) : null,
        type: job.type || 'unknown',
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.createdAt.toISOString(), // Use createdAt since updatedAt doesn't exist
      };
    });

    return {
      jobs: cronJobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getCronJobStats(): Promise<CronJobStats> {
    const last24Hours = DateUtil.getLast24Hours();

    const [
      total,
      active,
      paused,
      error,
      totalRuns,
      last24HoursCount,
      avgDuration,
    ] = await Promise.all([
      this.prisma.auditLog.count({
        where: { action: 'CRON_JOB' },
      }),
      this.prisma.auditLog.count({
        where: { action: 'CRON_JOB', statusCode: 200 },
      }),
      this.prisma.auditLog.count({
        where: { action: 'CRON_JOB', statusCode: 0 },
      }),
      this.prisma.auditLog.count({
        where: { action: 'CRON_JOB', statusCode: { not: 200 } },
      }),
      this.prisma.auditLog.count({
        where: { action: 'CRON_JOB' },
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'CRON_JOB',
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.auditLog.aggregate({
        where: { action: 'CRON_JOB', duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    const successRate = total > 0 ? (active / total) * 100 : 0;

    return {
      total,
      active,
      paused,
      error,
      totalRuns,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: avgDuration._avg.duration || 0,
      last24Hours: last24HoursCount,
    };
  }

  async getCronJobHistory(filters: {
    page: number;
    limit: number;
    jobId?: string;
  }) {
    const { page, limit, jobId } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      action: 'CRON_JOB',
    };

    if (jobId) {
      where.id = jobId;
    }

    const [history, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          duration: true,
          statusCode: true,
          responseData: true,
          requestData: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const cronJobHistory: CronJobHistory[] = history.map((log: any) => ({
      id: log.id,
      jobId: log.id,
      status: log.statusCode === 200 ? 'success' : 'failed',
      startedAt: log.createdAt.toISOString(),
      completedAt: log.createdAt.toISOString(), // Use createdAt since updatedAt doesn't exist
      duration: log.duration,
      message: log.responseData ? JSON.stringify(log.responseData) : null,
      error: log.statusCode !== 200 ? 'Job execution failed' : null,
    }));

    return {
      history: cronJobHistory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async runCronJob(jobType: string) {
    // Map job type to actual scheduler method
    const methodName = JOB_TYPE_MAP[jobType as keyof typeof JOB_TYPE_MAP];
    
    if (!methodName) {
      throw new Error(`Unknown job type: ${jobType}`);
    }

    try {
      this.logger.log(`Manually triggering job: ${jobType}`);
      
      // Call the actual scheduler method
      const scheduler = this.jobSchedulerService as any;
      if (typeof scheduler[methodName] === 'function') {
        await scheduler[methodName]();
        
        return {
          success: true,
          message: `Cron job ${jobType} execution triggered successfully`,
          jobType,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error(`Method ${methodName} not found in JobSchedulerService`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to run cron job ${jobType}:`, error);
      
      return {
        success: false,
        message: `Failed to trigger job: ${errorMessage}`,
        jobType,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async toggleCronJob(jobType: string, enabled: boolean) {
    try {
      // Get the method name for this job type
      const methodName = JOB_TYPE_MAP[jobType as keyof typeof JOB_TYPE_MAP];
      
      if (!methodName) {
        throw new Error(`Unknown job type: ${jobType}`);
      }

      // Update the state - this is what actually controls the job (persists to DB)
      await this.cronJobStateService.setJobEnabled(jobType, enabled);
      
      this.logger.log(
        `Cron job ${jobType} ${enabled ? 'enabled' : 'disabled'}. ` +
        `${enabled ? 'Will run' : 'Skipped'} on next scheduled time.`
      );

      return {
        success: true,
        message: `Cron job ${jobType} ${enabled ? 'enabled' : 'disabled'}`,
        jobType,
        enabled,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to toggle cron job ${jobType}:`, error);
      
      // Revert state on error
      await this.cronJobStateService.setJobEnabled(jobType, !enabled);
      
      return {
        success: false,
        message: `Failed to toggle job: ${errorMessage}`,
        jobType,
        enabled: !enabled,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getJobState(jobType: string): Promise<boolean> {
    return this.cronJobStateService.getJobState(jobType);
  }

  async getAllJobStates(): Promise<Record<string, boolean>> {
    return this.cronJobStateService.getAllStates();
  }

  async getCronSchedules() {
    const schedules = [
      {
        name: 'Pledge Jobs',
        schedule: '*/2 * * * *', // Every 2 minutes (from actual scheduler)
        description: 'Process pledge-related Salesforce operations',
        type: 'pledge',
        methodName: 'schedulePledgeJobs',
        nextRun: this.calculateNextRun('*/2 * * * *'),
        isEnabled: this.cronJobStateService.isJobEnabled('pledge'),
      },
      {
        name: 'One-off Jobs',
        schedule: '*/2 * * * *', // Every 2 minutes (from actual scheduler)
        description: 'Process one-off Salesforce operations',
        type: 'oneoff',
        methodName: 'scheduleOneOffJobs',
        nextRun: this.calculateNextRun('*/2 * * * *'),
        isEnabled: this.cronJobStateService.isJobEnabled('oneoff'),
      },
      {
        name: 'Recurring Jobs',
        schedule: '0 */5 * * * *', // Every 5 minutes (from actual scheduler)
        description: 'Process recurring cleanup jobs',
        type: 'recurring',
        methodName: 'scheduleRecurringJobs',
        nextRun: this.calculateNextRun('0 */5 * * * *'),
        isEnabled: this.cronJobStateService.isJobEnabled('recurring'),
      },
      {
        name: 'Hourly Jobs',
        schedule: '0 0 * * * *', // Every hour (from actual scheduler)
        description: 'Process hourly reports and maintenance',
        type: 'hourly',
        methodName: 'scheduleHourlyJobs',
        nextRun: this.calculateNextRun('0 0 * * * *'),
        isEnabled: this.cronJobStateService.isJobEnabled('hourly'),
      },
    ];

    return schedules;
  }

  private getScheduleFromType(type: string): string {
    switch (type) {
      case 'pledge':
        return '0 */2 * * * *'; // Every 2 minutes
      case 'oneoff':
        return '0 */2 * * * *'; // Every 2 minutes
      default:
        return '0 */5 * * * *'; // Default to every 5 minutes
    }
  }

  private getJobName(type: string): string {
    switch (type) {
      case 'pledge':
        return 'Pledge Processing';
      case 'oneoff':
        return 'One-off Jobs';
      default:
        return 'Unknown Job';
    }
  }

  private getJobDescription(type: string): string {
    switch (type) {
      case 'pledge':
        return 'Process pledge-related Salesforce operations';
      case 'oneoff':
        return 'Process one-off Salesforce operations';
      default:
        return 'Unknown job type';
    }
  }

  private calculateNextRun(schedule: string): string {
    // Simple calculation for next run time
    // In a real implementation, you'd use a cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 5 * 60 * 1000); // Add 5 minutes
    return nextRun.toISOString();
  }
}
