// libs/core/core.module.ts
import { Global, Module } from '@nestjs/common';
import { SalesforceConfigService } from './config/salesforce-config.service';

@Global()
@Module({
  providers: [SalesforceConfigService],
  exports: [SalesforceConfigService],
})
export class CoreModule {}
