// src/api-key/api-key.module.ts
import { Module } from '@nestjs/common';
import { ApiKeyController } from '@modules/api-key/controllers/api-key.controller';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { ApiKeyGuard } from '@modules/api-key/guards/api-key.guard';
import { AuditModule } from '@modules/audit/audit.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
