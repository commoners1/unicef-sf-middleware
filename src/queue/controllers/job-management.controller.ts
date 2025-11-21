// src/queue/controllers/job-management.controller.ts
import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';
import { QueueMonitorService } from '../services/queue-monitor.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class JobManagementController {
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
  ) {
    const limitNum = Math.min(limit, 100); // Cap at 100
    const offset = (page - 1) * limitNum;

    try {
      let queues = [];
      
      if (queueName) {
        queues = [{ name: queueName, queue: this.getQueueByName(queueName) }];
      } else {
        queues = [
          { name: 'salesforce', queue: this.salesforceQueue },
          { name: 'email', queue: this.emailQueue },
          { name: 'notifications', queue: this.notificationsQueue },
        ];
      }

      const allJobs = [];
      let totalCount = 0;

      for (const { name, queue } of queues) {
        let jobs = [];
        
        if (status === 'waiting') {
          jobs = await queue.getWaiting(0, -1);
        } else if (status === 'active') {
          jobs = await queue.getActive(0, -1);
        } else if (status === 'completed') {
          jobs = await queue.getCompleted(0, -1);
        } else if (status === 'failed') {
          jobs = await queue.getFailed(0, -1);
        } else {
          // Get all jobs
          const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaiting(0, -1),
            queue.getActive(0, -1),
            queue.getCompleted(0, -1),
            queue.getFailed(0, -1),
          ]);
          jobs = [...waiting, ...active, ...completed, ...failed];
        }

        const formattedJobs = jobs.map(job => ({
          id: job.id,
          name: job.name || `${name} Job`,
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
          queue: name,
          status: this.getJobStatus(job),
          createdAt: new Date(job.timestamp).toISOString(),
          updatedAt: new Date(job.processedOn || job.timestamp).toISOString(),
        }));

        allJobs.push(...formattedJobs);
      }

      // Apply search filter if provided
      let filteredJobs = allJobs;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        filteredJobs = allJobs.filter(job => {
          const name = (job.name || '').toLowerCase();
          const queue = (job.queue || '').toLowerCase();
          const jobStatus = (job.status || '').toLowerCase();
          const failedReason = (job.failedReason || '').toLowerCase();
          
          return (
            name.includes(searchLower) ||
            queue.includes(searchLower) ||
            jobStatus.includes(searchLower) ||
            failedReason.includes(searchLower)
          );
        });
      }

      // Sort by timestamp (newest first)
      filteredJobs.sort((a, b) => b.timestamp - a.timestamp);

      // Update total count after filtering
      totalCount = filteredJobs.length;

      // Apply pagination
      const paginatedJobs = filteredJobs.slice(offset, offset + limitNum);

      return {
        data: paginatedJobs,
        pagination: {
          page,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
  }

  @Get('jobs/:id')
  async getJobById(@Param('id') id: string) {
    try {
      // Search across all queues
      const queues = [
        { name: 'salesforce', queue: this.salesforceQueue },
        { name: 'email', queue: this.emailQueue },
        { name: 'notifications', queue: this.notificationsQueue },
      ];

      for (const { name, queue } of queues) {
        const job = await queue.getJob(id);
        if (job) {
          return {
            id: job.id,
            name: job.name || `${name} Job`,
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
            queue: name,
            status: this.getJobStatus(job),
            createdAt: new Date(job.timestamp).toISOString(),
            updatedAt: new Date(job.processedOn || job.timestamp).toISOString(),
          };
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
      const queues = [
        { name: 'salesforce', queue: this.salesforceQueue },
        { name: 'email', queue: this.emailQueue },
        { name: 'notifications', queue: this.notificationsQueue },
      ];

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
      const queues = [
        { name: 'salesforce', queue: this.salesforceQueue },
        { name: 'email', queue: this.emailQueue },
        { name: 'notifications', queue: this.notificationsQueue },
      ];

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
  async getQueueStats() {
    return await this.queueMonitor.getQueueStats();
  }

  @Get('counts')
  async getJobCounts() {
    const [salesforce, email, notifications] = await Promise.all([
      this.salesforceQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
      this.notificationsQueue.getJobCounts(),
    ]);

    return {
      waiting: salesforce.waiting + email.waiting + notifications.waiting,
      active: salesforce.active + email.active + notifications.active,
      completed: salesforce.completed + email.completed + notifications.completed,
      failed: salesforce.failed + email.failed + notifications.failed,
      delayed: salesforce.delayed + email.delayed + notifications.delayed,
      paused: salesforce.paused + email.paused + notifications.paused,
    };
  }

  @Get('performance')
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
    
    // Get all jobs (similar to getJobs but without pagination limit)
    const queues = [
      { name: 'salesforce', queue: this.salesforceQueue },
      { name: 'email', queue: this.emailQueue },
      { name: 'notifications', queue: this.notificationsQueue },
    ];

    const allJobs = [];

    for (const { name, queue } of queues) {
      let jobs = [];
      
      if (filters.status === 'waiting') {
        jobs = await queue.getWaiting(0, -1);
      } else if (filters.status === 'active') {
        jobs = await queue.getActive(0, -1);
      } else if (filters.status === 'completed') {
        jobs = await queue.getCompleted(0, -1);
      } else if (filters.status === 'failed') {
        jobs = await queue.getFailed(0, -1);
      } else {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(0, -1),
          queue.getActive(0, -1),
          queue.getCompleted(0, -1),
          queue.getFailed(0, -1),
        ]);
        jobs = [...waiting, ...active, ...completed, ...failed];
      }

      // Filter by queue name if specified
      if (filters.queue && filters.queue !== name) {
        continue;
      }

      // Filter by search if specified
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        jobs = jobs.filter((job: any) => {
          const jobName = (job.name || '').toLowerCase();
          const failedReason = (job.failedReason || '').toLowerCase();
          return jobName.includes(searchLower) || failedReason.includes(searchLower);
        });
      }

      const formattedJobs = jobs.map((job: any) => ({
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

      allJobs.push(...formattedJobs);
    }

    // Export based on format
    let result: string | Buffer;
    let contentType: string;

    if (format === 'json') {
      result = JSON.stringify(allJobs, null, 2);
      contentType = 'application/json; charset=utf-8';
    } else if (format === 'xlsx') {
      // XLSX format
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Jobs');

      if (allJobs.length === 0) {
        // Empty workbook with headers
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
          header: header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
          key: header,
          width: header.length < 20 ? 20 : header.length + 5,
        }));

        worksheet.columns = columns;

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };

        // Add data rows
        allJobs.forEach((job: any) => {
          worksheet.addRow(job);
        });

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
          if (column.header) {
            column.alignment = { vertical: 'top', wrapText: true };
          }
        });
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      result = Buffer.from(buffer);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      // CSV format
      // Helper function to escape CSV field
      const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) {
          return '';
        }
        const str = String(field);
        // Only quote if field contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      if (allJobs.length === 0) {
        result = '\uFEFFid,name,queue,status,createdAt,updatedAt,attemptsMade,failedReason,progress\r\n';
      } else {
        const headers = Object.keys(allJobs[0]);
        const headerRow = headers.map(escapeCsvField).join(',');
        const dataRows = allJobs.map((job: any) =>
          headers.map((key: string) => escapeCsvField(job[key])).join(',')
        );
        // Add UTF-8 BOM for Excel compatibility and use Windows line endings
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

  private getJobStatus(job: any): string {
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
}
