import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Query,
  Body,
  Param,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  Cache,
  CacheInterceptor,
  InvalidateCache,
  InvalidateCacheInterceptor,
} from '@infra/cache';
import type { RequestWithUser } from '@localTypes/request.types';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';
import { AuditService } from '@modules/audit/services/audit.service';
import { AuditLogExportDto } from '@modules/audit/dtos/audit-log-export.dto';
import { MarkDeliveredDto } from '@modules/audit/dtos/mark-delivered.dto';
import { JobTypeQueryDto } from '@modules/audit/dtos/audit-job-type.dto';
import type { AuditLogFilters } from '@utils/audit-filter.util';

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
  @Cache({
    module: 'audit',
    endpoint: 'stats',
    includeUserId: true,
    ttl: 60 * 1000,
  }) // 1 minute
  @UseInterceptors(CacheInterceptor)
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
  @InvalidateCache({
    module: 'audit',
    additionalKeys: ['audit:stats:*', 'audit:dashboard:stats'],
  })
  @UseInterceptors(InvalidateCacheInterceptor)
  async markAsDelivered(@Body() body: MarkDeliveredDto) {
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
  @Cache({ module: 'audit', endpoint: 'dashboard:stats', ttl: 2 * 60 * 1000 }) // 2 minutes
  @UseInterceptors(CacheInterceptor)
  async getDashboardStats() {
    return this.auditService.getDashboardStats();
  }

  @Get('actions')
  @Cache({ module: 'audit', endpoint: 'actions', ttl: 60 * 60 * 1000 }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getActions() {
    return this.auditService.getAuditActions();
  }

  @Get('methods')
  @Cache({ module: 'audit', endpoint: 'methods', ttl: 60 * 60 * 1000 }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getMethods() {
    return this.auditService.getAuditMethods();
  }

  @Get('status-codes')
  @Cache({ module: 'audit', endpoint: 'status-codes', ttl: 60 * 60 * 1000 }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getStatusCodes() {
    return this.auditService.getAuditStatusCodes();
  }

  @Post('export')
  async exportLogs(@Body() body: AuditLogExportDto, @Res() res: Response) {
    const result = await this.auditService.exportAuditLogs(
      body.filters,
      body.format,
    );

    let contentType: string;
    if (body.format === 'csv') {
      contentType = 'text/csv; charset=utf-8';
    } else if (body.format === 'xlsx') {
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      contentType = 'application/json; charset=utf-8';
    }

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${body.format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (body.format === 'xlsx' && Buffer.isBuffer(result)) {
      res.send(result);
    } else {
      res.send(result);
    }
  }

  @Get('analytics/usage-stats')
  @Cache({
    module: 'audit',
    endpoint: 'analytics:usage-stats',
    ttl: 5 * 60 * 1000,
  }) // 5 minutes
  @UseInterceptors(CacheInterceptor)
  async getUsageStats() {
    return this.auditService.getUsageStats();
  }

  @Get('analytics/hourly-usage')
  @Cache({
    module: 'audit',
    endpoint: 'analytics:hourly-usage',
    ttl: 5 * 60 * 1000,
  }) // 5 minutes
  @UseInterceptors(CacheInterceptor)
  async getHourlyUsage() {
    return this.auditService.getHourlyUsage();
  }

  @Get('analytics/top-endpoints')
  @Cache({
    module: 'audit',
    endpoint: 'analytics:top-endpoints',
    ttl: 5 * 60 * 1000,
  }) // 5 minutes
  @UseInterceptors(CacheInterceptor)
  async getTopEndpoints() {
    return this.auditService.getTopEndpoints();
  }

  @Get('analytics/user-activity')
  @Cache({
    module: 'audit',
    endpoint: 'analytics:user-activity',
    ttl: 3 * 60 * 1000,
  }) // 3 minutes
  @UseInterceptors(CacheInterceptor)
  async getUserActivity() {
    return this.auditService.getUserActivity();
  }

  @Get('dashboard/salesforce-logs/stats')
  @Cache({
    module: 'audit',
    endpoint: 'dashboard:salesforce-logs:stats',
    ttl: 2 * 60 * 1000,
  }) // 2 minutes
  @UseInterceptors(CacheInterceptor)
  async getSalesforceStats() {
    return this.auditService.getSalesforceStats();
  }

  @Post('salesforce-logs/export')
  async exportSalesforceLogs(
    @Body() body: AuditLogExportDto,
    @Res() res: Response,
  ) {
    const result = await this.auditService.exportSalesforceLogs(
      body.filters,
      body.format,
    );

    let contentType: string;
    if (body.format === 'csv') {
      contentType = 'text/csv; charset=utf-8';
    } else if (body.format === 'xlsx') {
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      contentType = 'application/json; charset=utf-8';
    }

    const filename = `salesforce-logs-${new Date().toISOString().split('T')[0]}.${body.format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (body.format === 'xlsx' && Buffer.isBuffer(result)) {
      res.send(result);
    } else {
      res.send(result);
    }
  }

  @Get('salesforce-logs/actions')
  @Cache({
    module: 'audit',
    endpoint: 'salesforce-logs:actions',
    ttl: 60 * 60 * 1000,
  }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getSalesforceActions() {
    return this.auditService.getSalesforceActions();
  }

  @Get('salesforce-logs/methods')
  @Cache({
    module: 'audit',
    endpoint: 'salesforce-logs:methods',
    ttl: 60 * 60 * 1000,
  }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getSalesforceMethods() {
    return this.auditService.getSalesforceMethods();
  }

  @Get('salesforce-logs/status-codes')
  @Cache({
    module: 'audit',
    endpoint: 'salesforce-logs:status-codes',
    ttl: 60 * 60 * 1000,
  }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getSalesforceStatusCodes() {
    return this.auditService.getSalesforceStatusCodes();
  }

  @Get('salesforce-logs/:id')
  async getSalesforceLogById(@Param('id') id: string) {
    return this.auditService.getSalesforceLogById(id);
  }
}
