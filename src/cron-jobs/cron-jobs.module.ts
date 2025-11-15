import { Module, forwardRef } from '@nestjs/common';
import { CronJobsController } from './cron-jobs.controller';
import { CronJobsService } from './cron-jobs.service';
import { CronJobStateService } from './cron-job-state.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [forwardRef(() => QueueModule)],
  controllers: [CronJobsController],
  providers: [CronJobsService, CronJobStateService],
  exports: [CronJobsService, CronJobStateService],
})
export class CronJobsModule {}
