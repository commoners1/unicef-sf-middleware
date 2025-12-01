import { Module } from '@nestjs/common';
import { ReportsController } from '@modules/reports/controllers/reports.controller';
import { ReportsService } from '@modules/reports/services/reports.service';
import { PrismaService } from '@infra/database/prisma.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService],
})
export class ReportsModule {}
