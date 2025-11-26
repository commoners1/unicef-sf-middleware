import { Prisma } from '@prisma/client';
import type { DynamicFilters } from './dynamic-filter.util';
import { parseColumnFilters, buildColumnFilterWhere, parseBoolean, buildDateRangeFilter } from './dynamic-filter.util';

export interface AuditLogFilters extends DynamicFilters {
  userId?: string;
  apiKeyId?: string;
  action?: string;
  method?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  isDelivered?: boolean;
}

export class AuditFilterBuilder {
  static buildBaseFilters(
    filters: AuditLogFilters
  ): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.apiKeyId) where.apiKeyId = filters.apiKeyId;
    if (filters.method) where.method = filters.method;
    if (filters.statusCode)
      where.statusCode = Number(filters.statusCode);
    const isDelivered = parseBoolean(filters.isDelivered);
    if (isDelivered !== undefined) where.isDelivered = isDelivered;

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    const dateFilter = buildDateRangeFilter(filters.startDate, filters.endDate);
    if (dateFilter) where.createdAt = dateFilter;

    // Search filter across multiple fields
    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { endpoint: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search, mode: 'insensitive' } },
        { type: { contains: filters.search, mode: 'insensitive' } },
        { referenceId: { contains: filters.search, mode: 'insensitive' } },
        { salesforceId: { contains: filters.search, mode: 'insensitive' } },
        { statusMessage: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const columnFilters = parseColumnFilters(filters.columnFilters);
    if (columnFilters && Object.keys(columnFilters).length > 0) {
      Object.assign(where, buildColumnFilterWhere(columnFilters));
    }

    return where;
  }

  static buildFiltersWithBase(
    filters: AuditLogFilters,
    baseFilter: Prisma.AuditLogWhereInput
  ): Prisma.AuditLogWhereInput {
    const baseFilters = this.buildBaseFilters(filters);
    if (Object.keys(baseFilters).length === 0) return baseFilter;
    return { AND: [baseFilter, baseFilters] };
  }

  static buildSalesforceFilters(
    filters: AuditLogFilters,
    salesforceMethods: string[],
    cronJobMethods: string[]
  ): Prisma.AuditLogWhereInput {
    const baseSalesforceFilter: Prisma.AuditLogWhereInput = {
      OR: [
        {
          method: { in: salesforceMethods },
        },
        {
          action: 'CRON_JOB',
          method: { in: cronJobMethods },
        },
      ],
    };

    const baseFilters = this.buildBaseFilters(filters);
    
    if (filters.action === 'NOT_CRON_JOB') {
      baseFilters.action = { not: 'CRON_JOB' };
    }

    return { AND: [baseSalesforceFilter, baseFilters] };
  }
}

