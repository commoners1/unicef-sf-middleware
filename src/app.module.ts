// src/app.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule'; // Add this
import { PrismaService } from '@infra/prisma.service';
import { HealthController } from './health/health.controller';
import { SalesforceModule } from './salesforce/salesforce.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { AuditModule } from './audit/audit.module';
import { QueueModule } from './queue/queue.module'; // Add this
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { ErrorsModule } from './errors/errors.module';
import { CoreModule } from '../libs/core/core.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CoreModule,
    TerminusModule,
    HttpModule,
    ScheduleModule.forRoot(), // Add this for cron jobs
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
    QueueModule, // Add this
    CronJobsModule,
    ReportsModule,
    SettingsModule,
    ErrorsModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
