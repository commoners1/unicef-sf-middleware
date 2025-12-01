// src/app.module.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { HealthModule } from './modules/health/health.module';
import { SalesforceModule } from './modules/salesforce/salesforce.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { AuditModule } from './modules/audit/audit.module';
import { QueueModule } from './modules/queue/queue.module';

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

  it('should have HealthModule imported', () => {
    const healthModule = module.get(HealthModule);
    expect(healthModule).toBeDefined();
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
