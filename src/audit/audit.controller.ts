// src/audit/audit.controller.ts
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

  // Get undelivered cron job data
  @Get('cron-jobs')
  async getUndeliveredCronJobs(
    @Request() req: RequestWithUser,
    @Query('jobType') jobType?: string,
  ) {
    return this.auditService.getUndeliveredCronJobs(req.user.id, jobType);
  }

  // Mark jobs as delivered
  @Post('mark-delivered')
  async markAsDelivered(
    @Request() req: RequestWithUser,
    @Body() body: { jobIds: string[] },
  ) {
    return this.auditService.markAsDelivered(body.jobIds);
  }

  // Dashboard endpoints (admin access)
  @Get('dashboard/logs')
  async getDashboardLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('userId') userId?: string,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('action') action?: string,
    @Query('method') method?: string,
    @Query('statusCode') statusCode?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('isDelivered') isDelivered?: boolean,
  ) {
    return this.auditService.getAllLogs({
      page,
      limit,
      userId,
      apiKeyId,
      action,
      method,
      statusCode,
      startDate,
      endDate,
      search,
      isDelivered,
    });
  }

  @Get('dashboard/salesforce-logs')
  async getDashboardSalesforceLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('userId') userId?: string,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('action') action?: string,
    @Query('method') method?: string,
    @Query('statusCode') statusCode?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('isDelivered') isDelivered?: boolean,
  ) {
    return this.auditService.getSalesforceLogs({
      page,
      limit,
      userId,
      apiKeyId,
      action,
      method,
      statusCode,
      startDate,
      endDate,
      search,
      isDelivered,
    });
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
  async exportLogs(
    @Body() body: { format: 'csv' | 'json' | 'xlsx'; filters: any },
  ) {
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

  // Analytics endpoints
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

  // Salesforce-specific endpoints
  @Get('dashboard/salesforce-logs/stats')
  async getSalesforceStats() {
    return this.auditService.getSalesforceStats();
  }

  // Literal routes must come before parameterized routes
  @Post('salesforce-logs/export')
  async exportSalesforceLogs(
    @Body() body: { format: 'csv' | 'json' | 'xlsx'; filters: any },
  ) {
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

  // Parameterized route must come after literal routes
  @Get('salesforce-logs/:id')
  async getSalesforceLogById(@Param('id') id: string) {
    return this.auditService.getSalesforceLogById(id);
  }
}
