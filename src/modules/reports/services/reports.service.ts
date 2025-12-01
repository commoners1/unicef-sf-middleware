import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/database/prisma.service';

type Report = any;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllReports(): Promise<Report[]> {
    return this.prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getReportById(id: string): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async generateReport(id: string): Promise<Report> {
    await this.getReportById(id);
    await this.prisma.report.update({
      where: { id },
      data: {
        status: 'generating',
      },
    });

    await new Promise((res) => setTimeout(res, 1000));
    const newSize = Math.floor(Math.random() * 4_000_000) + 1_000_000;

    return this.prisma.report.update({
      where: { id },
      data: {
        status: 'ready',
        lastGenerated: new Date(),
        size: newSize,
      },
    });
  }

  async getReportFile(
    id: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const report = await this.getReportById(id);
    if (!report.filePath) throw new NotFoundException('No report file');

    return {
      filePath: report.filePath,
      fileName: `${report.name}.${report.format || 'pdf'}`,
    };
  }
}
