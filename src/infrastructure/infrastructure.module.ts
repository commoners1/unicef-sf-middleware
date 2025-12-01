import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { CacheModule } from './cache/cache.module';

@Global()
@Module({
  imports: [CacheModule, PrismaModule],
  exports: [CacheModule, PrismaModule],
})
export class InfrastructureModule {}
