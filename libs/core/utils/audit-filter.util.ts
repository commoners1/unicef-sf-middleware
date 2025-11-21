import { Prisma } from '@prisma/client';

export interface AuditLogFilters {
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
}

/**
 * Utility class for building Prisma where clauses for audit log queries
 */
export class AuditFilterBuilder {
  /**
   * Build base filter conditions from filter parameters
   */
  static buildBaseFilters(
    filters: AuditLogFilters
  ): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.apiKeyId) where.apiKeyId = filters.apiKeyId;
    if (filters.method) where.method = filters.method;
    if (filters.statusCode)
      where.statusCode = Number(filters.statusCode);
    if (filters.isDelivered !== undefined) {
      // Handle both boolean and string values (from query params)
      // Query params come as strings, so we need to parse them
      where.isDelivered = typeof filters.isDelivered === 'boolean' 
        ? filters.isDelivered 
        : String(filters.isDelivered).toLowerCase() === 'true';
    }

    // Action filter with case-insensitive search
    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

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

    return where;
  }

  /**
   * Build filters with additional base conditions (e.g., for Salesforce logs)
   */
  static buildFiltersWithBase(
    filters: AuditLogFilters,
    baseFilter: Prisma.AuditLogWhereInput
  ): Prisma.AuditLogWhereInput {
    const baseFilters = this.buildBaseFilters(filters);

    // Combine base filter with additional conditions
    const andConditions: Prisma.AuditLogWhereInput[] = [baseFilter];

    // Add filter conditions that aren't already in baseFilter
    if (Object.keys(baseFilters).length > 0) {
      andConditions.push(baseFilters);
    }

    return andConditions.length > 1 ? { AND: andConditions } : baseFilter;
  }

  /**
   * Build Salesforce-specific filters with complex OR conditions
   */
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
    const andConditions: Prisma.AuditLogWhereInput[] = [baseSalesforceFilter];

    // Apply additional filters
    if (filters.userId)
      andConditions.push({ userId: filters.userId });
    if (filters.apiKeyId)
      andConditions.push({ apiKeyId: filters.apiKeyId });
    if (filters.statusCode) {
      andConditions.push({ statusCode: Number(filters.statusCode) });
    }
    if (filters.isDelivered !== undefined) {
      // Handle both boolean and string values (from query params)
      // Query params come as strings, so we need to parse them
      const isDelivered = typeof filters.isDelivered === 'boolean' 
        ? filters.isDelivered 
        : String(filters.isDelivered).toLowerCase() === 'true';
      andConditions.push({ isDelivered });
    }

    // Date range
    if (filters.startDate || filters.endDate) {
      const dateCondition: Prisma.DateTimeFilter = {};
      if (filters.startDate) dateCondition.gte = new Date(filters.startDate);
      if (filters.endDate) dateCondition.lte = new Date(filters.endDate);
      andConditions.push({ createdAt: dateCondition });
    }

    // Action filter
    if (filters.action) {
      // Handle special case for excluding CRON_JOB (for POST filter)
      if (filters.action === 'NOT_CRON_JOB') {
        andConditions.push({
          action: { not: 'CRON_JOB' },
        });
      } else {
        andConditions.push({
          action: { contains: filters.action, mode: 'insensitive' },
        });
      }
    }

    // Method filter
    if (filters.method) {
      andConditions.push({ method: filters.method });
    }

    // Search filter across multiple fields including new Salesforce-specific fields
    if (filters.search) {
      andConditions.push({
        OR: [
          { action: { contains: filters.search, mode: 'insensitive' } },
          { endpoint: { contains: filters.search, mode: 'insensitive' } },
          { ipAddress: { contains: filters.search, mode: 'insensitive' } },
          { type: { contains: filters.search, mode: 'insensitive' } },
          { referenceId: { contains: filters.search, mode: 'insensitive' } },
          { salesforceId: { contains: filters.search, mode: 'insensitive' } },
          { statusMessage: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: andConditions };
  }
}

