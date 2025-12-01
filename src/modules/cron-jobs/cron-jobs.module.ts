import { Module, forwardRef } from '@nestjs/common';
import { CronJobsController } from '@modules/cron-jobs/controllers/cron-jobs.controller';
import { CronJobsService } from '@modules/cron-jobs/services/cron-jobs.service';
import { CronJobStateService } from '@modules/cron-jobs/services/cron-job-state.service';
import { QueueModule } from '@modules/queue/queue.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [forwardRef(() => QueueModule), AuthModule],
  controllers: [CronJobsController],
  providers: [CronJobsService, CronJobStateService],
  exports: [CronJobsService, CronJobStateService],
})
export class CronJobsModule {}
