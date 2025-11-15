// src/app.module.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '@infra/prisma.service';
import { HealthController } from './health/health.controller';
import { SalesforceModule } from './salesforce/salesforce.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { AuditModule } from './audit/audit.module';
import { QueueModule } from './queue/queue.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have ConfigModule configured as global', () => {
    const configModule = module.get(ConfigModule);
    expect(configModule).toBeDefined();
  });

  it('should have PrismaService provided', () => {
    const prismaService = module.get(PrismaService);
    expect(prismaService).toBeDefined();
  });

  it('should have HealthController configured', () => {
    const healthController = module.get(HealthController);
    expect(healthController).toBeDefined();
  });

  it('should configure BullModule with Redis connection', () => {
    const configService = module.get(ConfigService);
    const redisUrl = configService.get('REDIS_URL');
    expect(redisUrl).toBeDefined();

    const bullModule = module.get(BullModule);
    expect(bullModule).toBeDefined();
  });

  it('should have all required modules imported', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(ConfigModule);
    expect(imports).toContain(BullModule);
    expect(imports).toContain(SalesforceModule);
    expect(imports).toContain(AuthModule);
    expect(imports).toContain(UserModule);
    expect(imports).toContain(ApiKeyModule);
    expect(imports).toContain(AuditModule);
    expect(imports).toContain(QueueModule);
  });
});
