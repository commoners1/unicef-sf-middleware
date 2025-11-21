import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';
import { Prisma } from '@prisma/client';
import { getLiveSettings } from '../settings/settings.service';
import { DateUtil } from '@core/utils/date.util';
import { GroupByUtil } from '@core/utils/group-by.util';
import {
  AuditFilterBuilder,
  type AuditLogFilters,
} from '@core/utils/audit-filter.util';
import {
  SALESFORCE_METHODS,
  CRON_JOB_METHODS,
} from '@core/utils/constants';
import { SanitizationUtil } from '@core/utils/sanitization.util';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logApiCall(
    userId: string | null,
    apiKeyId: string | null,
    action: string,
    endpoint: string,
    method: string,
    type: string,
    requestData: Record<string, unknown> | null,
    responseData: Record<string, unknown> | null,
    statusCode: number,
    ipAddress: string,
    userAgent: string,
    duration: number,
    referenceId: string | null,
    salesforceId: string | null,
    statusMessage: string | null,
    statusPayment: string | null,
    isDelivered: boolean = false,
  ) {
    const settings = await getLiveSettings(this.prisma);
    if (!settings.security.enableAuditLog) return;
    return this.prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        apiKeyId: apiKeyId || undefined,
        action,
        endpoint,
        method,
        type,
        referenceId: referenceId || undefined,
        salesforceId: salesforceId || undefined,
        requestData: requestData ? (requestData as Prisma.InputJsonValue) : undefined,
        responseData: responseData ? (responseData as Prisma.InputJsonValue) : undefined,
        statusCode,
        statusMessage: statusMessage || undefined,
        statusPayment: statusPayment || undefined,
        ipAddress,
        userAgent,
        duration,
        isDelivered: isDelivered,
      },
    });
  }

  async getUserLogs(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          apiKey: {
            select: { name: true, description: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserStats(userId: string) {
    const last24h = DateUtil.getLast24Hours();
    const last7d = DateUtil.getLast7Days();

    const [today, week, total] = await Promise.all([
      this.prisma.auditLog.count({
        where: { userId, createdAt: { gte: last24h } },
      }),
      this.prisma.auditLog.count({
        where: { userId, createdAt: { gte: last7d } },
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    return { today, week, total };
  }

  async logJobProcessing(
    userId: string | null,
    apiKeyId: string | null,
    jobId: string,
    jobType: string,
    endpoint: string,
    status: 'started' | 'completed' | 'failed',
    processingTime?: number,
    errorMessage?: string,
    result?: Record<string, unknown> | null,
  ) {
    const settings = await getLiveSettings(this.prisma);
    if (!settings.security.enableAuditLog) return;
    return this.prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        apiKeyId: apiKeyId || undefined,
        action: `JOB_${status.toUpperCase()}`,
        endpoint,
        method: 'QUEUE',
        type: jobType,
        requestData: {
          jobId,
          status,
          processingTime,
          errorMessage,
        } as Prisma.InputJsonValue,
        responseData: result ? (result as Prisma.InputJsonValue) : undefined,
        statusCode:
          status === 'completed' ? 200 : status === 'failed' ? 500 : 202,
        ipAddress: 'system',
        userAgent: 'queue-processor',
        duration: processingTime || 0,
      },
    });
  }

  async logJobScheduling(
    userId: string | null,
    apiKeyId: string | null,
    jobType: string,
    endpoint: string,
    scheduleType: 'cron' | 'manual' | 'recurring',
    jobData: Record<string, unknown>,
    success: boolean,
    errorMessage?: string,
    isDelivered: boolean = false,
  ) {
    const settings = await getLiveSettings(this.prisma);
    if (!settings.security.enableAuditLog) return;
    return this.prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        apiKeyId: apiKeyId || undefined,
        action: 'JOB_SCHEDULED',
        endpoint,
        method: 'SCHEDULER',
        type: jobType,
        requestData: {
          scheduleType,
          jobData: jobData,
          success,
          errorMessage,
        } as Prisma.InputJsonValue,
        responseData: { scheduled: success } as Prisma.InputJsonValue,
        statusCode: success ? 200 : 500,
        ipAddress: 'system',
        userAgent: 'job-scheduler',
        duration: 0,
        isDelivered,
      },
    });
  }

  async logQueueOperation(
    operation: 'job_added' | 'job_removed' | 'job_retried' | 'queue_cleared',
    userId: string | null,
    apiKeyId: string | null,
    queueName: string,
    jobId?: string,
    jobData?: Record<string, unknown>,
    success: boolean = true,
    errorMessage?: string,
  ) {
    const settings = await getLiveSettings(this.prisma);
    if (!settings.security.enableAuditLog) return;
    return this.prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        apiKeyId: apiKeyId || undefined,
        action: `QUEUE_${operation.toUpperCase()}`,
        endpoint: queueName,
        method: 'QUEUE',
        type: 'queue_operation',
        requestData: {
          operation,
          queueName,
          jobId,
          jobData: jobData || undefined,
          success,
          errorMessage,
        } as Prisma.InputJsonValue,
        responseData: { operation, success } as Prisma.InputJsonValue,
        statusCode: success ? 200 : 500,
        ipAddress: 'system',
        userAgent: 'queue-service',
        duration: 0,
      },
    });
  }

  async getUndeliveredCronJobs(
    userId: string | null, 
    jobType?: string,
    maxLimit?: number,
  ) {
    // Sanitize inputs
    const sanitizedUserId = userId ? SanitizationUtil.sanitizeString(userId) : null;
    const sanitizedJobType = jobType ? SanitizationUtil.sanitizeString(jobType) : undefined;
    const sanitizedMaxLimit = maxLimit ? Math.min(Math.max(Number(maxLimit), 1), 10000) : undefined;

    const where: Record<string, unknown> = {
      userId: sanitizedUserId ?? null,
      isDelivered: false,
      action: 'CRON_JOB',
      ipAddress: 'system',
    };

    if (sanitizedJobType) {
      where.type = sanitizedJobType;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      ...(sanitizedMaxLimit && sanitizedMaxLimit > 0 && { take: sanitizedMaxLimit }),
      include: {
        apiKey: {
          select: { name: true, description: true },
        },
      },
    });
  }

  async markAsDelivered(jobIds: string[]) {
    // Sanitize job IDs to prevent injection
    const sanitizedIds = jobIds
      .map((id) => SanitizationUtil.sanitizeString(id))
      .filter((id): id is string => id !== null && id.length > 0);

    if (sanitizedIds.length === 0) {
      throw new Error('No valid job IDs provided');
    }

    // Limit batch size to prevent abuse
    const maxBatchSize = 1000;
    const idsToProcess = sanitizedIds.slice(0, maxBatchSize);

    const result = await this.prisma.auditLog.updateMany({
      where: {
        id: { in: idsToProcess },
        isDelivered: false,
      },
      data: {
        isDelivered: true,
      },
    });

    return {
      updated: result.count,
      message: `Marked ${result.count} jobs as delivered`,
    };
  }

  private getStandardIncludes() {
    return {
      user: {
        select: { id: true, name: true, email: true },
      },
      apiKey: {
        select: { name: true, description: true },
      },
    };
  }

  private async getLogsWithFilters(
    filters: AuditLogFilters,
    baseFilter?: Prisma.AuditLogWhereInput,
  ) {
    // Sanitize input to prevent XSS and injection attacks
    const sanitizedFilters = SanitizationUtil.sanitizeObject(filters) as AuditLogFilters;
    
    // Sanitize string fields
    if (sanitizedFilters.search) {
      sanitizedFilters.search = SanitizationUtil.sanitizeSearchQuery(sanitizedFilters.search);
    }
    if (sanitizedFilters.action) {
      sanitizedFilters.action = SanitizationUtil.sanitizeString(sanitizedFilters.action);
    }
    if (sanitizedFilters.method) {
      sanitizedFilters.method = SanitizationUtil.sanitizeString(sanitizedFilters.method);
    }
    if (sanitizedFilters.userId) {
      sanitizedFilters.userId = SanitizationUtil.sanitizeString(sanitizedFilters.userId);
    }
    if (sanitizedFilters.apiKeyId) {
      sanitizedFilters.apiKeyId = SanitizationUtil.sanitizeString(sanitizedFilters.apiKeyId);
    }

    const page = Math.max(Number(sanitizedFilters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(sanitizedFilters.limit) || 50, 1), 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    const where = baseFilter
      ? AuditFilterBuilder.buildFiltersWithBase(sanitizedFilters, baseFilter)
      : AuditFilterBuilder.buildBaseFilters(sanitizedFilters);

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: this.getStandardIncludes(),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllLogs(filters: AuditLogFilters) {
    return this.getLogsWithFilters(filters);
  }

  async getSalesforceLogs(filters: AuditLogFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const where = AuditFilterBuilder.buildSalesforceFilters(
      filters,
      SALESFORCE_METHODS as unknown as string[],
      CRON_JOB_METHODS as unknown as string[],
    );

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: this.getStandardIncludes(),
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private getSalesforceBaseFilter(): Prisma.AuditLogWhereInput {
    return {
      OR: [
        {
          method: {
            in: SALESFORCE_METHODS as unknown as string[],
          },
        },
        {
          action: 'CRON_JOB',
          method: {
            in: CRON_JOB_METHODS as unknown as string[],
          },
        },
      ],
    };
  }

  async getSalesforceStats() {
    const last24h = DateUtil.getLast24Hours();
    const last7d = DateUtil.getLast7Days();
    const baseFilter = this.getSalesforceBaseFilter();

    const [today, week, total, byStatus, byAction, byMethod] =
      await Promise.all([
        this.prisma.auditLog.count({
          where: {
            ...baseFilter,
            createdAt: { gte: last24h },
          },
        }),
        this.prisma.auditLog.count({
          where: {
            ...baseFilter,
            createdAt: { gte: last7d },
          },
        }),
        this.prisma.auditLog.count({ where: baseFilter }),
        this.prisma.auditLog.groupBy({
          by: ['statusCode'],
          where: baseFilter,
          _count: { statusCode: true },
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where: baseFilter,
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
        this.prisma.auditLog.groupBy({
          by: ['method'],
          where: baseFilter,
          _count: { method: true },
        }),
      ]);

    return {
      today,
      week,
      total,
      byStatus: GroupByUtil.transformStatusCodeResults(byStatus),
      byAction: GroupByUtil.reduceGroupByResults(byAction, 'action'),
      byMethod: GroupByUtil.reduceGroupByResults(byMethod, 'method'),
    };
  }

  async getSalesforceLogById(id: string) {
    // Sanitize ID to prevent injection
    const sanitizedId = SanitizationUtil.sanitizeString(id);
    if (!sanitizedId) {
      throw new NotFoundException('Invalid log ID format');
    }

    const baseFilter = this.getSalesforceBaseFilter();

    const log = await this.prisma.auditLog.findFirst({
      where: {
        id: sanitizedId,
        ...baseFilter,
      },
      include: this.getStandardIncludes(),
    });

    if (!log) {
      throw new NotFoundException('Salesforce log not found');
    }

    return log;
  }

  private convertLogsToCsv(logs: any[]): string {
    const headers = [
      'ID',
      'User',
      'Action',
      'Method',
      'Endpoint',
      'Status Code',
      'IP Address',
      'Created At',
    ];
    const rows = logs.map((log: any) => [
      log.id,
      log.user?.name || 'System',
      log.action,
      log.method,
      log.endpoint,
      log.statusCode,
      log.ipAddress,
      log.createdAt.toISOString(),
    ]);

    return [headers, ...rows]
      .map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
      .join('\n');
  }

  private async exportLogsToFormat(
    logs: any[],
    format: 'csv' | 'json' | 'xlsx',
  ): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    if (format === 'csv') {
      return this.convertLogsToCsv(logs);
    }

    throw new Error('XLSX export not implemented yet');
  }

  async exportSalesforceLogs(filters: AuditLogFilters, format: 'csv' | 'json' | 'xlsx') {
    const result = await this.getSalesforceLogs({ ...filters, limit: 10000 });
    return this.exportLogsToFormat(result.logs, format);
  }

  async getSalesforceActions() {
    const baseFilter = this.getSalesforceBaseFilter();

    const actions = await this.prisma.auditLog.findMany({
      where: baseFilter,
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return actions.map((a: any) => a.action);
  }

  async getSalesforceMethods() {
    const baseFilter = this.getSalesforceBaseFilter();

    const methods = await this.prisma.auditLog.findMany({
      where: baseFilter,
      select: { method: true },
      distinct: ['method'],
      orderBy: { method: 'asc' },
    });
    return methods.map((m: any) => m.method);
  }

  async getSalesforceStatusCodes() {
    const baseFilter = this.getSalesforceBaseFilter();

    const statusCodes = await this.prisma.auditLog.findMany({
      where: baseFilter,
      select: { statusCode: true },
      distinct: ['statusCode'],
      orderBy: { statusCode: 'asc' },
    });
    return statusCodes.map((s: any) => s.statusCode);
  }

  async getDashboardStats() {
    const last24h = DateUtil.getLast24Hours();
    const last7d = DateUtil.getLast7Days();

    const [today, week, total, byStatus, byAction, byMethod] =
      await Promise.all([
        this.prisma.auditLog.count({
          where: { createdAt: { gte: last24h } },
        }),
        this.prisma.auditLog.count({
          where: { createdAt: { gte: last7d } },
        }),
        this.prisma.auditLog.count(),
        this.prisma.auditLog.groupBy({
          by: ['statusCode'],
          _count: { statusCode: true },
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
        this.prisma.auditLog.groupBy({
          by: ['method'],
          _count: { method: true },
        }),
      ]);

    return {
      today,
      week,
      total,
      byStatus: GroupByUtil.transformStatusCodeResults(byStatus),
      byAction: GroupByUtil.reduceGroupByResults(byAction, 'action'),
      byMethod: GroupByUtil.reduceGroupByResults(byMethod, 'method'),
    };
  }

  async getAuditActions() {
    const actions = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return actions.map((a: any) => a.action);
  }

  async getAuditMethods() {
    const methods = await this.prisma.auditLog.findMany({
      select: { method: true },
      distinct: ['method'],
      orderBy: { method: 'asc' },
    });
    return methods.map((m: any) => m.method);
  }

  async getAuditStatusCodes() {
    const statusCodes = await this.prisma.auditLog.findMany({
      select: { statusCode: true },
      distinct: ['statusCode'],
      orderBy: { statusCode: 'asc' },
    });
    return statusCodes.map((s: any) => s.statusCode);
  }

  async exportAuditLogs(filters: AuditLogFilters, format: 'csv' | 'json' | 'xlsx') {
    const result = await this.getAllLogs({ ...filters, limit: 10000 });
    return this.exportLogsToFormat(result.logs, format);
  }

  async getUsageStats() {
    const last24h = DateUtil.getLast24Hours();

    const [totalRequests, uniqueUsers, avgResponseTime, peakHourlyRequests, errorRate] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: last24h } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: last24h } },
        _count: { userId: true },
      }).then((users: any[]) => users.length),
      this.prisma.auditLog.aggregate({
        where: { createdAt: { gte: last24h } },
        _avg: { duration: true },
      }).then((result: any) => Math.round(result._avg.duration || 0)),
      this.getPeakHourlyRequests(),
      this.getErrorRate(),
    ]);

    return {
      totalRequests,
      uniqueUsers,
      averageResponseTime: avgResponseTime,
      peakHourlyRequests,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  async getHourlyUsage() {
    const last24h = DateUtil.getLast24Hours();
    
    // Optimized: Use raw SQL for better performance with single query
    // Falls back to optimized batch queries if raw SQL is not available
    try {
      // Use raw SQL to group by hour - much faster than 24 separate queries
      const hourlyData = await this.prisma.$queryRaw<Array<{
        hour: string;
        requests: bigint;
        users: bigint;
      }>>`
        SELECT 
          TO_CHAR("createdAt", 'HH24:MI') as hour,
          COUNT(*)::bigint as requests,
          COUNT(DISTINCT "userId")::bigint as users
        FROM "AuditLog"
        WHERE "createdAt" >= ${last24h}
        GROUP BY TO_CHAR("createdAt", 'HH24:MI')
        ORDER BY hour ASC
      `;

      // Fill in missing hours with zero values
      const buckets = DateUtil.getHourlyBuckets();
      const dataMap = new Map(
        hourlyData.map((item) => [item.hour, {
          hour: item.hour,
          requests: Number(item.requests),
          users: Number(item.users),
        }])
      );

      return buckets.map((bucket) => {
        const hour = DateUtil.formatHour(bucket.start);
        return dataMap.get(hour) || { hour, requests: 0, users: 0 };
      });
    } catch (error) {
      // Fallback: Optimized batch queries if raw SQL fails
      const buckets = DateUtil.getHourlyBuckets();
      const hourlyData = await Promise.all(
        buckets.map(async (bucket) => {
          const [requests, uniqueUsers] = await Promise.all([
            this.prisma.auditLog.count({
              where: {
                createdAt: {
                  gte: bucket.start,
                  lt: bucket.end,
                },
              },
            }),
            this.prisma.auditLog.groupBy({
              by: ['userId'],
              where: {
                createdAt: {
                  gte: bucket.start,
                  lt: bucket.end,
                },
              },
              _count: { userId: true },
            }).then((users: any[]) => users.length),
          ]);

          return {
            hour: DateUtil.formatHour(bucket.start),
            requests,
            users: uniqueUsers,
          };
        })
      );

      return hourlyData;
    }
  }

  async getTopEndpoints() {
    const last24h = DateUtil.getLast24Hours();
    
    const endpointStats = await this.prisma.auditLog.groupBy({
      by: ['endpoint'],
      where: { createdAt: { gte: last24h } },
      _count: { endpoint: true },
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10,
    });

    const totalRequests = endpointStats.reduce((sum: number, stat: any) => sum + stat._count.endpoint, 0);

    return endpointStats.map((stat: any) => ({
      endpoint: stat.endpoint,
      requests: stat._count.endpoint,
      percentage: Math.round((stat._count.endpoint / totalRequests) * 100 * 10) / 10,
    }));
  }

  async getUserActivity() {
    const last24h = DateUtil.getLast24Hours();
    
    const userStats = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: last24h } },
      _count: { userId: true },
      _max: { createdAt: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    });

    // Get user details
    const userIds = userStats.map((stat: any) => stat.userId).filter((id: any): id is string => id !== null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    const userMap = new Map(users.map((user: any) => [user.id, user]));

    return userStats.map((stat: any) => {
      const user: any = userMap.get(stat.userId || '');
      const lastActive = stat._max.createdAt;
      if (!lastActive) {
        return {
          user: user?.email || 'Unknown User',
          requests: stat._count.userId,
          lastActive: 'Never',
        };
      }
      
      const timeDiff = Date.now() - lastActive.getTime();
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      return {
        user: user?.email || 'Unknown User',
        requests: stat._count.userId,
        lastActive: minutesAgo < 1 ? 'Just now' : 
                   minutesAgo < 60 ? `${minutesAgo} minutes ago` :
                   `${Math.floor(minutesAgo / 60)} hours ago`,
      };
    });
  }

  private async getPeakHourlyRequests(): Promise<number> {
    const last24h = DateUtil.getLast24Hours();
    
    try {
      // Optimized: Use raw SQL to get peak in a single query
      const result = await this.prisma.$queryRaw<Array<{ peak: bigint }>>`
        SELECT MAX(hourly_count)::bigint as peak
        FROM (
          SELECT 
            TO_CHAR("createdAt", 'HH24:MI') as hour,
            COUNT(*) as hourly_count
          FROM "AuditLog"
          WHERE "createdAt" >= ${last24h}
          GROUP BY TO_CHAR("createdAt", 'HH24:MI')
        ) hourly_stats
      `;
      
      return result.length > 0 ? Number(result[0].peak) : 0;
    } catch (error) {
      // Fallback: Optimized batch queries
      const buckets = DateUtil.getHourlyBuckets();
      const counts = await Promise.all(
        buckets.map((bucket) =>
          this.prisma.auditLog.count({
            where: {
              createdAt: {
                gte: bucket.start,
                lt: bucket.end,
              },
            },
          })
        )
      );
      
      return Math.max(...counts, 0);
    }
  }

  private async getErrorRate() {
    const last24h = DateUtil.getLast24Hours();
    
    const [total, errors] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: last24h } },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: last24h },
          statusCode: { gte: 400 },
        },
      }),
    ]);
    
    return total > 0 ? errors / total : 0;
  }
}
