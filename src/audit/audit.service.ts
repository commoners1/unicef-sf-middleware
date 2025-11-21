import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';
import { Prisma } from '@prisma/client';
import { getLiveSettings } from '../settings/settings.service';

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
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
    const where: Record<string, unknown> = {
      userId: userId ?? null,
      isDelivered: false,
      action: 'CRON_JOB',
      ipAddress: 'system',
    };

    if (jobType) {
      where.type = jobType;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      ...(maxLimit && maxLimit > 0 && { take: maxLimit }),
      include: {
        apiKey: {
          select: { name: true, description: true },
        },
      },
    });
  }

  async markAsDelivered(jobIds: string[]) {
    const result = await this.prisma.auditLog.updateMany({
      where: {
        id: { in: jobIds },
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

  async getAllLogs(filters: {
    page?: number;
    limit?: number;
    userId?: string;
    apiKeyId?: string;
    action?: string;
    method?: string;
    statusCode?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    isDelivered?: boolean;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.apiKeyId) where.apiKeyId = filters.apiKeyId;
    if (filters.action)
      where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.method) where.method = filters.method;
    if (filters.statusCode) where.statusCode = Number(filters.statusCode);
    if (filters.isDelivered !== undefined)
      where.isDelivered = filters.isDelivered;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { endpoint: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          apiKey: {
            select: { name: true, description: true },
          },
        },
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

  async getSalesforceLogs(filters: {
    page?: number;
    limit?: number;
    userId?: string;
    apiKeyId?: string;
    action?: string;
    method?: string;
    statusCode?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    isDelivered?: boolean;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const salesforceMethods = [
      'callPledgeChargeApi',
      'callPledgeApi',
      'callOneOffApi',
      'callXenditPaymentLinkApi',
    ];
    
    const cronJobMethods = ['callPledge', 'callOneoff'];

    const where: any = {
      OR: [
        {
          method: {
            in: salesforceMethods,
          },
        },
        {
          action: 'CRON_JOB',
          method: {
            in: cronJobMethods,
          },
        },
      ],
    };

    const andConditions: any[] = [];

    if (filters.userId) andConditions.push({ userId: filters.userId });
    if (filters.apiKeyId) andConditions.push({ apiKeyId: filters.apiKeyId });
    if (filters.statusCode) {
      andConditions.push({ statusCode: Number(filters.statusCode) });
    }
    if (filters.isDelivered !== undefined) {
      andConditions.push({ isDelivered: filters.isDelivered });
    }

    if (filters.startDate || filters.endDate) {
      const dateCondition: any = {};
      if (filters.startDate) {
        dateCondition.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        dateCondition.lte = new Date(filters.endDate);
      }
      andConditions.push({ createdAt: dateCondition });
    }

    if (filters.action) {
      andConditions.push({
        action: { contains: filters.action, mode: 'insensitive' },
      });
    }

    if (filters.method) {
      andConditions.push({ method: filters.method });
    }

    if (filters.search) {
      andConditions.push({
        OR: [
          { action: { contains: filters.search, mode: 'insensitive' } },
          { endpoint: { contains: filters.search, mode: 'insensitive' } },
          { ipAddress: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = [{ OR: where.OR }, ...andConditions];
      delete where.OR;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          apiKey: {
            select: { name: true, description: true },
          },
        },
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

  private getSalesforceBaseFilter() {
    const salesforceMethods = [
      'callPledgeChargeApi',
      'callPledgeApi',
      'callOneOffApi',
      'callXenditPaymentLinkApi',
    ];
    
    const cronJobMethods = ['callPledge', 'callOneoff'];

    return {
      OR: [
        {
          method: {
            in: salesforceMethods,
          },
        },
        {
          action: 'CRON_JOB',
          method: {
            in: cronJobMethods,
          },
        },
      ],
    };
  }

  async getSalesforceStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

    const successCount =
      byStatus.find((s: any) => s.statusCode >= 200 && s.statusCode < 300)?._count
        .statusCode || 0;
    const errorCount =
      byStatus.find((s: any) => s.statusCode >= 400)?._count.statusCode || 0;

    return {
      today,
      week,
      total,
      byStatus: {
        success: successCount,
        error: errorCount,
        warning: 0,
      },
      byAction: byAction.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.action] = item._count.action;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byMethod: byMethod.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.method] = item._count.method;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async getSalesforceLogById(id: string) {
    const baseFilter = this.getSalesforceBaseFilter();

    const log = await this.prisma.auditLog.findFirst({
      where: {
        id,
        ...baseFilter,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        apiKey: {
          select: { name: true, description: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Salesforce log not found');
    }

    return log;
  }

  async exportSalesforceLogs(filters: any, format: 'csv' | 'json' | 'xlsx') {
    const logs = await this.getSalesforceLogs({ ...filters, limit: 10000 });

    if (format === 'json') {
      return JSON.stringify(logs.logs, null, 2);
    }

    if (format === 'csv') {
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
      const rows = logs.logs.map((log: any) => [
        log.id,
        log.user?.name || 'System',
        log.action,
        log.method,
        log.endpoint,
        log.statusCode,
        log.ipAddress,
        log.createdAt.toISOString(),
      ]);

      const csvContent = [headers, ...rows]
        .map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
        .join('\n');

      return csvContent;
    }

    throw new Error('XLSX export not implemented yet');
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
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

    const successCount =
      byStatus.find((s: any) => s.statusCode >= 200 && s.statusCode < 300)?._count
        .statusCode || 0;
    const errorCount =
      byStatus.find((s: any) => s.statusCode >= 400)?._count.statusCode || 0;

    return {
      today,
      week,
      total,
      byStatus: {
        success: successCount,
        error: errorCount,
        warning: 0,
      },
      byAction: byAction.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.action] = item._count.action;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byMethod: byMethod.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.method] = item._count.method;
          return acc;
        },
        {} as Record<string, number>,
      ),
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

  async exportAuditLogs(filters: any, format: 'csv' | 'json' | 'xlsx') {
    const logs = await this.getAllLogs({ ...filters, limit: 10000 });

    if (format === 'json') {
      return JSON.stringify(logs.logs, null, 2);
    }

    if (format === 'csv') {
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
      const rows = logs.logs.map((log: any) => [
        log.id,
        log.user?.name || 'System',
        log.action,
        log.method,
        log.endpoint,
        log.statusCode,
        log.ipAddress,
        log.createdAt.toISOString(),
      ]);

      const csvContent = [headers, ...rows]
        .map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
        .join('\n');

      return csvContent;
    }

    throw new Error('XLSX export not implemented yet');
  }

  async getUsageStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const hourlyData = [];
    
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(last24h.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const [requests, uniqueUsers] = await Promise.all([
        this.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: hourStart,
              lt: hourEnd,
            },
          },
        }),
        this.prisma.auditLog.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: hourStart,
              lt: hourEnd,
            },
          },
          _count: { userId: true },
        }).then((users: any[]) => users.length),
      ]);

      hourlyData.push({
        hour: hourStart.toISOString().substr(11, 5), // HH:MM format
        requests,
        users: uniqueUsers,
      });
    }

    return hourlyData;
  }

  async getTopEndpoints() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
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
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
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

  private async getPeakHourlyRequests() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let peak = 0;
    
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(last24h.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const count = await this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: hourStart,
            lt: hourEnd,
          },
        },
      });
      
      peak = Math.max(peak, count);
    }
    
    return peak;
  }

  private async getErrorRate() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
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
