import { Controller, Get, Post, Param, Res, UseGuards, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getAllReports() {
    return await this.reportsService.getAllReports();
  }

  @Post(':id/generate')
  async generate(@Param('id') id: string) {
    return await this.reportsService.generateReport(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { filePath, fileName } = await this.reportsService.getReportFile(id);
    if (!filePath) throw new NotFoundException('No report file');
    return res.download(filePath, fileName);
  }
}
