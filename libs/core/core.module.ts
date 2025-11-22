// libs/core/core.module.ts
import { Global, Module } from '@nestjs/common';
import { SalesforceConfigService } from './services/salesforce-config.service';
import { CacheModule } from './cache/cache.module';

@Global()
@Module({
  imports: [CacheModule],
  providers: [SalesforceConfigService],
  exports: [SalesforceConfigService, CacheModule],
})
export class CoreModule {}

