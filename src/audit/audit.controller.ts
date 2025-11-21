import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Query,
  Body,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { AuditService } from './audit.service';
import type { RequestWithUser } from '../types/request.types';
import type { AuditLogFilters } from '@core/utils/audit-filter.util';
import { AuditLogExportDto } from './dto/audit-log-export.dto';
import { MarkDeliveredDto } from './dto/mark-delivered.dto';
import { IsString, IsOptional } from 'class-validator';

class JobTypeQueryDto {
  @IsOptional()
  @IsString()
  jobType?: string;
}

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @Request() req: RequestWithUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.auditService.getUserLogs(req.user.id, page, limit);
  }

  @Get('stats')
  async getStats(@Request() req: RequestWithUser) {
    return this.auditService.getUserStats(req.user.id);
  }

  @Get('cron-jobs')
  async getUndeliveredCronJobs(
    @Request() req: RequestWithUser,
    @Query() query: JobTypeQueryDto,
  ) {
    return this.auditService.getUndeliveredCronJobs(req.user.id, query.jobType);
  }

  @Post('mark-delivered')
  async markAsDelivered(
    @Request() req: RequestWithUser,
    @Body() body: MarkDeliveredDto,
  ) {
    return this.auditService.markAsDelivered(body.jobIds);
  }

  @Get('dashboard/logs')
  async getDashboardLogs(@Query() filters: AuditLogFilters) {
    return this.auditService.getAllLogs(filters);
  }

  @Get('dashboard/salesforce-logs')
  async getDashboardSalesforceLogs(@Query() filters: AuditLogFilters) {
    return this.auditService.getSalesforceLogs(filters);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.auditService.getDashboardStats();
  }

  @Get('actions')
  async getActions() {
    return this.auditService.getAuditActions();
  }

  @Get('methods')
  async getMethods() {
    return this.auditService.getAuditMethods();
  }

  @Get('status-codes')
  async getStatusCodes() {
    return this.auditService.getAuditStatusCodes();
  }

  @Post('export')
  async exportLogs(@Body() body: AuditLogExportDto) {
    const result = await this.auditService.exportAuditLogs(
      body.filters,
      body.format,
    );

    return {
      data: result,
      contentType: body.format === 'csv' ? 'text/csv' : 'application/json',
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.${body.format}`,
    };
  }

  @Get('analytics/usage-stats')
  async getUsageStats() {
    return this.auditService.getUsageStats();
  }

  @Get('analytics/hourly-usage')
  async getHourlyUsage() {
    return this.auditService.getHourlyUsage();
  }

  @Get('analytics/top-endpoints')
  async getTopEndpoints() {
    return this.auditService.getTopEndpoints();
  }

  @Get('analytics/user-activity')
  async getUserActivity() {
    return this.auditService.getUserActivity();
  }

  @Get('dashboard/salesforce-logs/stats')
  async getSalesforceStats() {
    return this.auditService.getSalesforceStats();
  }

  @Post('salesforce-logs/export')
  async exportSalesforceLogs(@Body() body: AuditLogExportDto) {
    const result = await this.auditService.exportSalesforceLogs(
      body.filters,
      body.format,
    );

    return {
      data: result,
      contentType: body.format === 'csv' ? 'text/csv' : 'application/json',
      filename: `salesforce-logs-${new Date().toISOString().split('T')[0]}.${body.format}`,
    };
  }

  @Get('salesforce-logs/actions')
  async getSalesforceActions() {
    return this.auditService.getSalesforceActions();
  }

  @Get('salesforce-logs/methods')
  async getSalesforceMethods() {
    return this.auditService.getSalesforceMethods();
  }

  @Get('salesforce-logs/status-codes')
  async getSalesforceStatusCodes() {
    return this.auditService.getSalesforceStatusCodes();
  }

  @Get('salesforce-logs/:id')
  async getSalesforceLogById(@Param('id') id: string) {
    return this.auditService.getSalesforceLogById(id);
  }
}
