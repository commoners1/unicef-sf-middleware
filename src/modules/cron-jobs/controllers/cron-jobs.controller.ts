import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';
import { CronJobsService } from '@modules/cron-jobs/services/cron-jobs.service';
import type { RequestWithUser } from '@localTypes/request.types';
import {
  Cache,
  CacheInterceptor,
  InvalidateCache,
  InvalidateCacheInterceptor,
} from '@infra/cache';

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
  @Cache({ module: 'cron-jobs', endpoint: 'stats', ttl: 60 * 1000 }) // 1 minute
  @UseInterceptors(CacheInterceptor)
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
  @InvalidateCache({ module: 'cron-jobs', endpoint: 'states' })
  @InvalidateCache({ module: 'cron-jobs', endpoint: 'state' })
  @InvalidateCache({ module: 'cron-jobs', endpoint: 'schedules' })
  @UseInterceptors(InvalidateCacheInterceptor)
  async toggleCronJob(
    @Request() req: RequestWithUser,
    @Param('type') type: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.cronJobsService.toggleCronJob(type, body.enabled);
  }

  @Get('states')
  @Cache({ module: 'cron-jobs', endpoint: 'states', ttl: 30 * 1000 }) // 30 seconds
  @UseInterceptors(CacheInterceptor)
  async getJobStates(@Request() req: RequestWithUser) {
    return await this.cronJobsService.getAllJobStates();
  }

  @Get(':type/state')
  @Cache({ module: 'cron-jobs', endpoint: 'state', ttl: 30 * 1000 }) // 30 seconds
  @UseInterceptors(CacheInterceptor)
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
  @Cache({ module: 'cron-jobs', endpoint: 'schedules', ttl: 60 * 60 * 1000 }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getCronSchedules(@Request() req: RequestWithUser) {
    return await this.cronJobsService.getCronSchedules();
  }
}
