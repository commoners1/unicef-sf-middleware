// src/queue/controllers/job-management.controller.ts
import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
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
          jobs = await queue.getWaiting(offset, offset + limitNum - 1);
        } else if (status === 'active') {
          jobs = await queue.getActive(offset, offset + limitNum - 1);
        } else if (status === 'completed') {
          jobs = await queue.getCompleted(offset, offset + limitNum - 1);
        } else if (status === 'failed') {
          jobs = await queue.getFailed(offset, offset + limitNum - 1);
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
        totalCount += jobs.length;
      }

      // Sort by timestamp (newest first)
      allJobs.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const paginatedJobs = allJobs.slice(offset, offset + limitNum);

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
