import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@infra/database/prisma.module';
import { HealthModule } from '@modules/health/health.module';
import { SalesforceModule } from '@modules/salesforce/salesforce.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { AuditModule } from '@modules/audit/audit.module';
import { QueueModule } from '@modules/queue/queue.module';
import { CronJobsModule } from '@modules/cron-jobs/cron-jobs.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { ErrorsModule } from '@modules/errors/errors.module';
import { CoreModule } from '@core/core.module';
import { InfrastructureModule } from '@infra/infrastructure.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CoreModule,
    TerminusModule,
    InfrastructureModule,
    HttpModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: {
          url: cs.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    SalesforceModule,
    AuthModule,
    UserModule,
    ApiKeyModule,
    AuditModule,
    QueueModule,
    CronJobsModule,
    ReportsModule,
    SettingsModule,
    ErrorsModule,
    HealthModule,
  ],
  providers: [PrismaModule],
  exports: [PrismaModule],
})
export class AppModule {}
