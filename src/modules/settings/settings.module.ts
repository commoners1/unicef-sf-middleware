import { Module } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma.service';
import { SettingsController } from '@modules/settings/controllers/settings.controller';
import { SettingsService } from '@modules/settings/services/settings.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService, PrismaService],
})
export class SettingsModule {}
