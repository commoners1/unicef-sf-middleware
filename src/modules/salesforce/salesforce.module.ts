import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '@modules/audit/audit.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { SalesforceService } from '@modules/salesforce/services/salesforce.service';
import { SalesforceController } from '@modules/salesforce/controllers/salesforce.controller';

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
