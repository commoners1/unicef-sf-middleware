import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SalesforceService } from './salesforce.service';
import { SalesforceController } from './salesforce.controller';
import { AuditModule } from '../audit/audit.module';
import { ApiKeyModule } from '../api-key/api-key.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: process.env.QUEUE_NAME || 'sfQueue',
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: { url: cs.get<string>('REDIS_URL')! },
      }),
    }),
    AuditModule,
    ApiKeyModule,
  ],
  controllers: [SalesforceController],
  providers: [SalesforceService],
  exports: [SalesforceService],
})
export class SalesforceModule {}
