import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CronJobsService } from './cron-jobs.service';
import type { RequestWithUser } from '../types/request.types';

@Controller('cron-jobs')
@UseGuards(JwtAuthGuard)
export class CronJobsController {
  constructor(private readonly cronJobsService: CronJobsService) {}

  @Get()
  async getCronJobs(
    @Request() req: RequestWithUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.cronJobsService.getCronJobs({
      page: Number(page),
      limit: Number(limit),
      status,
      type,
    });
  }

  @Get('stats')
  async getCronJobStats(@Request() req: RequestWithUser) {
    return this.cronJobsService.getCronJobStats();
  }

  @Get('history')
  async getCronJobHistory(
    @Request() req: RequestWithUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('jobId') jobId?: string,
  ) {
    return this.cronJobsService.getCronJobHistory({
      page: Number(page),
      limit: Number(limit),
      jobId,
    });
  }

  @Post(':type/run')
  async runCronJob(
    @Request() req: RequestWithUser,
    @Param('type') type: string,
  ) {
    return this.cronJobsService.runCronJob(type);
  }

  @Put(':type/toggle')
  async toggleCronJob(
    @Request() req: RequestWithUser,
    @Param('type') type: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.cronJobsService.toggleCronJob(type, body.enabled);
  }

  @Get('states')
  async getJobStates(@Request() req: RequestWithUser) {
    return this.cronJobsService.getAllJobStates();
  }

  @Get(':type/state')
  async getJobState(
    @Request() req: RequestWithUser,
    @Param('type') type: string,
  ) {
    return {
      jobType: type,
      enabled: await this.cronJobsService.getJobState(type),
    };
  }

  @Get('schedules')
  async getCronSchedules(@Request() req: RequestWithUser) {
    return this.cronJobsService.getCronSchedules();
  }
}
