import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cache, CacheInterceptor } from '@infra/cache';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';
import { QueueMonitorService } from '@modules/queue/services/queue-monitor.service';
import {
  JobFilterBuilder,
  type JobFilters,
} from '@utils/job-filter.util';
import { CsvUtil } from '@utils/csv.util';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class JobManagementController {
  private readonly MAX_JOBS_PER_STATUS = 5000;

  constructor(
    @InjectQueue('salesforce') private salesforceQueue: Queue,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    private readonly queueMonitor: QueueMonitorService,
  ) {}

  @Get('jobs')
  async getJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('queue') queueName?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    try {
      const filters: JobFilters = {
        page,
        limit,
        queue: queueName,
        status,
        search,
        startDate,
        endDate,
        sortBy: sortBy || 'timestamp',
        sortOrder: sortOrder || 'desc',
      };

      let queues = [];
      if (queueName) {
        queues = [{ name: queueName, queue: this.getQueueByName(queueName) }];
      } else {
        queues = this.getAllQueues();
      }

      const queuePromises = queues.map(async ({ name, queue }) => {
        let jobs = [];

        if (status === 'waiting') {
          jobs = await queue.getWaiting(0, this.MAX_JOBS_PER_STATUS);
        } else if (status === 'active') {
          jobs = await queue.getActive(0, this.MAX_JOBS_PER_STATUS);
        } else if (status === 'completed') {
          jobs = await queue.getCompleted(0, this.MAX_JOBS_PER_STATUS);
        } else if (status === 'failed') {
          jobs = await queue.getFailed(0, this.MAX_JOBS_PER_STATUS);
        } else {
          const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaiting(0, this.MAX_JOBS_PER_STATUS),
            queue.getActive(0, this.MAX_JOBS_PER_STATUS),
            queue.getCompleted(0, this.MAX_JOBS_PER_STATUS),
            queue.getFailed(0, this.MAX_JOBS_PER_STATUS),
          ]);
          jobs = [
            ...waiting.reverse(),
            ...active.reverse(),
            ...completed.reverse(),
            ...failed.reverse(),
          ];
        }

        return jobs
          .filter((job) => job.id != null)
          .map((job) => this.formatJobData(job, name));
      });

      const queueResults = await Promise.all(queuePromises);
      const allJobs = queueResults.flat();

      const result = JobFilterBuilder.applyFilters(allJobs, filters);

      return {
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
  }

  @Get('jobs/:id')
  async getJobById(@Param('id') id: string) {
    try {
      const queues = this.getAllQueues();

      for (const { name, queue } of queues) {
        const job = await queue.getJob(id);
        if (job) {
          return this.formatJobData(job, name);
        }
      }

      throw new Error('Job not found');
    } catch (error) {
      throw new Error(`Failed to fetch job: ${error.message}`);
    }
  }

  @Post('jobs/:id/retry')
  async retryJob(@Param('id') id: string) {
    try {
      const queues = this.getAllQueues();

      for (const { name, queue } of queues) {
        const job = await queue.getJob(id);
        if (job) {
          await job.retry();
          return {
            message: `Job ${id} retried successfully`,
            job: {
              id: job.id,
              queue: name,
              status: this.getJobStatus(job),
            },
          };
        }
      }

      throw new Error('Job not found');
    } catch (error) {
      throw new Error(`Failed to retry job: ${error.message}`);
    }
  }

  @Delete('jobs/:id')
  async removeJob(@Param('id') id: string) {
    try {
      const queues = this.getAllQueues();

      for (const { name, queue } of queues) {
        const job = await queue.getJob(id);
        if (job) {
          await job.remove();
          return {
            message: `Job ${id} removed successfully`,
          };
        }
      }

      throw new Error('Job not found');
    } catch (error) {
      throw new Error(`Failed to remove job: ${error.message}`);
    }
  }

  @Post('queues/:queueName/pause')
  async pauseQueue(@Param('queueName') queueName: string) {
    try {
      const queue = this.getQueueByName(queueName);
      await queue.pause();
      return {
        message: `Queue ${queueName} paused successfully`,
      };
    } catch (error) {
      throw new Error(`Failed to pause queue: ${error.message}`);
    }
  }

  @Post('queues/:queueName/resume')
  async resumeQueue(@Param('queueName') queueName: string) {
    try {
      const queue = this.getQueueByName(queueName);
      await queue.resume();
      return {
        message: `Queue ${queueName} resumed successfully`,
      };
    } catch (error) {
      throw new Error(`Failed to resume queue: ${error.message}`);
    }
  }

  @Post('queues/:queueName/clear')
  async clearQueue(@Param('queueName') queueName: string) {
    try {
      const queue = this.getQueueByName(queueName);
      const cleared = await queue.obliterate();
      return {
        message: `Queue ${queueName} cleared successfully`,
        cleared,
      };
    } catch (error) {
      throw new Error(`Failed to clear queue: ${error.message}`);
    }
  }

  @Get('stats')
  @Cache({ module: 'queue', endpoint: 'stats', ttl: 15 * 1000 }) // 15 seconds
  @UseInterceptors(CacheInterceptor)
  async getQueueStats() {
    return await this.queueMonitor.getQueueStats();
  }

  @Get('counts')
  @Cache({ module: 'queue', endpoint: 'counts', ttl: 10 * 1000 }) // 10 seconds
  @UseInterceptors(CacheInterceptor)
  async getJobCounts() {
    const [salesforce, email, notifications] = await Promise.all([
      this.salesforceQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
      this.notificationsQueue.getJobCounts(),
    ]);

    return {
      waiting: salesforce.waiting + email.waiting + notifications.waiting,
      active: salesforce.active + email.active + notifications.active,
      completed:
        salesforce.completed + email.completed + notifications.completed,
      failed: salesforce.failed + email.failed + notifications.failed,
      delayed: salesforce.delayed + email.delayed + notifications.delayed,
      paused: salesforce.paused + email.paused + notifications.paused,
    };
  }

  @Get('performance')
  @Cache({ module: 'queue', endpoint: 'performance', ttl: 30 * 1000 }) // 30 seconds (Tier 2)
  @UseInterceptors(CacheInterceptor)
  async getPerformanceMetrics() {
    return await this.queueMonitor.getQueueHealth();
  }

  @Post('export')
  async exportJobs(
    @Body() body: { filters?: any; format?: 'csv' | 'json' | 'xlsx' },
    @Res() res: Response,
  ) {
    const format = body.format || 'csv';
    const filters = body.filters || {};

    const exportMaxJobs = this.MAX_JOBS_PER_STATUS * 2;
    const queues = this.getAllQueues();

    const queuePromises = queues.map(async ({ name, queue }) => {
      if (filters.queue && filters.queue !== name) {
        return [];
      }

      let jobs = [];

      if (filters.status === 'waiting') {
        jobs = await queue.getWaiting(0, exportMaxJobs);
      } else if (filters.status === 'active') {
        jobs = await queue.getActive(0, exportMaxJobs);
      } else if (filters.status === 'completed') {
        jobs = await queue.getCompleted(0, exportMaxJobs);
      } else if (filters.status === 'failed') {
        jobs = await queue.getFailed(0, exportMaxJobs);
      } else {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(0, exportMaxJobs),
          queue.getActive(0, exportMaxJobs),
          queue.getCompleted(0, exportMaxJobs),
          queue.getFailed(0, exportMaxJobs),
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
      }

      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        jobs = jobs.filter((job: any) => {
          const jobName = (job.name || '').toLowerCase();
          const failedReason = (job.failedReason || '').toLowerCase();
          return (
            jobName.includes(searchLower) || failedReason.includes(searchLower)
          );
        });
      }

      return jobs.map((job: any) => ({
        id: job.id,
        name: job.name || `${name} Job`,
        queue: name,
        status: this.getJobStatus(job),
        createdAt: new Date(job.timestamp).toISOString(),
        updatedAt: new Date(job.processedOn || job.timestamp).toISOString(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason || '',
        progress: job.progress || 0,
      }));
    });

    const queueResults = await Promise.all(queuePromises);
    const allJobs = queueResults.flat();

    let result: string | Buffer;
    let contentType: string;

    if (format === 'json') {
      result = JSON.stringify(allJobs, null, 2);
      contentType = 'application/json; charset=utf-8';
    } else if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Jobs');

      if (allJobs.length === 0) {
        const headers = [
          { header: 'ID', key: 'id', width: 30 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Queue', key: 'queue', width: 15 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Created At', key: 'createdAt', width: 25 },
          { header: 'Updated At', key: 'updatedAt', width: 25 },
          { header: 'Attempts Made', key: 'attemptsMade', width: 15 },
          { header: 'Failed Reason', key: 'failedReason', width: 50 },
          { header: 'Progress', key: 'progress', width: 12 },
        ];
        worksheet.columns = headers;
      } else {
        const headers = Object.keys(allJobs[0]);
        const columns = headers.map((header) => ({
          header:
            header.charAt(0).toUpperCase() +
            header.slice(1).replace(/([A-Z])/g, ' $1'),
          key: header,
          width: header.length < 20 ? 20 : header.length + 5,
        }));

        worksheet.columns = columns;

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };

        allJobs.forEach((job: any) => {
          worksheet.addRow(job);
        });

        worksheet.columns.forEach((column) => {
          if (column.header) {
            column.alignment = { vertical: 'top', wrapText: true };
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      result = Buffer.from(buffer);
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      const escapeCsvField = CsvUtil.escapeCsvField;

      if (allJobs.length === 0) {
        result =
          '\uFEFFid,name,queue,status,createdAt,updatedAt,attemptsMade,failedReason,progress\r\n';
      } else {
        const headers = Object.keys(allJobs[0]);
        const headerRow = headers.map(escapeCsvField).join(',');
        const dataRows = allJobs.map((job: any) =>
          headers.map((key: string) => escapeCsvField(job[key])).join(','),
        );
        result = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
      }
      contentType = 'text/csv; charset=utf-8';
    }

    const filename = `jobs-${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'xlsx' && Buffer.isBuffer(result)) {
      res.send(result);
    } else {
      res.send(result);
    }
  }

  private getQueueByName(queueName: string): Queue {
    switch (queueName) {
      case 'salesforce':
        return this.salesforceQueue;
      case 'email':
        return this.emailQueue;
      case 'notifications':
        return this.notificationsQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  private getJobStatus(
    job: any,
  ): 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused' {
    if (job.finishedOn) {
      return job.failedReason ? 'failed' : 'completed';
    }
    if (job.processedOn) {
      return 'active';
    }
    if (job.delay > 0) {
      return 'delayed';
    }
    return 'waiting';
  }

  private getAllQueues(): Array<{ name: string; queue: Queue }> {
    return [
      { name: 'salesforce', queue: this.salesforceQueue },
      { name: 'email', queue: this.emailQueue },
      { name: 'notifications', queue: this.notificationsQueue },
    ];
  }

  private formatJobData(job: any, queueName: string) {
    return {
      id: job.id!,
      name: job.name || `${queueName} Job`,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      delay: job.delay,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
      stacktrace: job.stacktrace,
      queue: queueName,
      status: this.getJobStatus(job),
      createdAt: new Date(job.timestamp).toISOString(),
      updatedAt: new Date(job.processedOn || job.timestamp).toISOString(),
    };
  }
}
