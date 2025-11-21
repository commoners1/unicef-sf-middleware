import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { DateUtil } from '@core/utils/date.util';
import { GroupByUtil } from '@core/utils/group-by.util';
import { SanitizationUtil } from '@core/utils/sanitization.util';
import { ErrorLogFiltersDto } from './dto/error-log-filters.dto';

@Injectable()
export class ErrorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ErrorLogFiltersDto | any) {
    // Sanitize input to prevent XSS and injection attacks
    const sanitizedQuery = SanitizationUtil.sanitizeObject(query);

    // Filtering
    const where: any = {};
    if (sanitizedQuery.type) where.type = SanitizationUtil.sanitizeString(sanitizedQuery.type);
    if (sanitizedQuery.source) where.source = SanitizationUtil.sanitizeString(sanitizedQuery.source);
    if (sanitizedQuery.environment) where.environment = SanitizationUtil.sanitizeString(sanitizedQuery.environment);
    if (sanitizedQuery.resolved !== undefined) where.resolved = sanitizedQuery.resolved === 'true' || sanitizedQuery.resolved === true;
    if (sanitizedQuery.search) {
      const sanitizedSearch = SanitizationUtil.sanitizeSearchQuery(sanitizedQuery.search);
      where.OR = [
        { message: { contains: sanitizedSearch, mode: 'insensitive' } },
        { source: { contains: sanitizedSearch, mode: 'insensitive' } },
        { type: { contains: sanitizedSearch, mode: 'insensitive' } }
      ];
    }
    if (sanitizedQuery.startDate || sanitizedQuery.endDate) {
      where.createdAt = {};
      if (sanitizedQuery.startDate) where.createdAt.gte = new Date(sanitizedQuery.startDate);
      if (sanitizedQuery.endDate) where.createdAt.lte = new Date(sanitizedQuery.endDate);
    }

    // Pagination with validation
    const page = Math.max(Number(sanitizedQuery.page) || 1, 1);
    const limit = Math.min(Math.max(Number(sanitizedQuery.limit) || 10, 1), 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Sort - default to timestamp descending (most recent first)
    // Sanitize sort field to prevent injection
    const allowedSortFields = ['timestamp', 'createdAt', 'updatedAt', 'type', 'source', 'environment'];
    const sortField = allowedSortFields.includes(sanitizedQuery.sortBy) 
      ? sanitizedQuery.sortBy 
      : 'timestamp';
    const sortOrder = sanitizedQuery.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: any = { [sortField]: sortOrder };

    // Get total count of individual error log entries
    const total = await this.prisma.errorLog.count({ where });
    
    // Get paginated individual error log entries
    const errors = await this.prisma.errorLog.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });
    
    return {
      data: errors.map((e: any) => ({
        id: e.id,
        message: e.message,
        type: e.type,
        source: e.source,
        environment: e.environment,
        resolved: e.resolved,
        resolvedAt: e.resolvedAt,
        resolvedBy: e.resolvedBy,
        stackTrace: e.stackTrace,
        userId: e.userId,
        userAgent: e.userAgent,
        ipAddress: e.ipAddress,
        url: e.url,
        method: e.method,
        statusCode: e.statusCode,
        timestamp: e.timestamp,
        tags: e.tags,
        metadata: e.metadata,
        occurrences: e.occurrences,
        firstSeen: e.firstSeen,
        lastSeen: e.lastSeen,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      pagination: { page, limit, total }
    };
  }

  async findById(id: string) {
    // Sanitize ID to prevent injection
    const sanitizedId = SanitizationUtil.sanitizeString(id);
    if (!sanitizedId) {
      throw new Error('Invalid error log ID format');
    }

    // Find individual error log entry by ID
    const error = await this.prisma.errorLog.findUnique({
      where: { id: sanitizedId },
    });
    return error;
  }

  async getStats() {
    // Count individual error log entries (not grouped)
    const todayStart = DateUtil.getLast24Hours();
    
    const [total, unresolved, today, critical, error, warning, info, allErrors, topSourcesGrouped, topTypesGrouped] = await Promise.all([
      this.prisma.errorLog.count(),
      this.prisma.errorLog.count({ where: { resolved: false } }),
      this.prisma.errorLog.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.errorLog.count({ where: { type: 'critical' } }),
      this.prisma.errorLog.count({ where: { type: 'error' } }),
      this.prisma.errorLog.count({ where: { type: 'warning' } }),
      this.prisma.errorLog.count({ where: { type: 'info' } }),
      this.prisma.errorLog.findMany({ select: { occurrences: true } }),
      this.prisma.errorLog.groupBy({ 
        by: ['source'], 
        _count: { source: true }, 
        orderBy: { _count: { source: 'desc' } }, 
        take: 5 
      }),
      this.prisma.errorLog.groupBy({ 
        by: ['type'], 
        _count: { type: true }, 
        orderBy: { _count: { type: 'desc' } }, 
        take: 5 
      }),
    ]);
    
    // Calculate average occurrences (using the occurrences field from individual entries)
    const avg = allErrors.length > 0 
      ? Math.round(allErrors.reduce((a: number, b: any) => a + (b.occurrences || 1), 0) / allErrors.length) 
      : 0;
    
    // Transform groupBy results
    const topSources = topSourcesGrouped.map((e: any) => ({ 
      source: e.source, 
      count: e._count.source 
    }));
    const topTypes = topTypesGrouped.map((e: any) => ({ 
      type: e.type, 
      count: e._count.type 
    }));
    
    return { 
      total, 
      unresolved, 
      critical, 
      error, 
      warning, 
      info, 
      today, 
      avgOccurrences: avg, 
      topSources, 
      topTypes 
    };
  }

  async getTrends({ range = '7d' } = {}) {
    // Trend over 24h/7d/30d
    const days = range === '30d' ? 30 : range === '24h' ? 1 : 7;
    const start = DateUtil.getDaysAgo(days);
    const all = await this.prisma.errorLog.findMany({ 
      where: { createdAt: { gte: start } }, 
      orderBy: { createdAt: 'asc' }
    });
    
    // Date key formatter - hourly for 24h, daily otherwise
    const dateKey = days === 1 
      ? (d: Date) => DateUtil.formatHour(d)
      : (d: Date) => d.toISOString().split('T')[0];
    
    const trend: Record<string, { 
      count: number; 
      resolved: number; 
      critical: number; 
      error: number; 
      warning: number;
    }> = {};
    
    for (const e of all) {
      const k = dateKey(e.createdAt);
      if (!trend[k]) {
        trend[k] = { count: 0, resolved: 0, critical: 0, error: 0, warning: 0 };
      }
      trend[k].count++;
      if (e.resolved) trend[k].resolved++;
      if (e.type === 'critical') trend[k].critical++;
      if (e.type === 'error') trend[k].error++;
      if (e.type === 'warning') trend[k].warning++;
    }
    
    return Object.entries(trend).map(([date, data]) => ({ date, ...data }));
  }

  async resolve(id: string, resolvedBy: string) {
    // Sanitize inputs to prevent injection
    const sanitizedId = SanitizationUtil.sanitizeString(id);
    const sanitizedResolvedBy = SanitizationUtil.sanitizeString(resolvedBy);
    
    if (!sanitizedId || !sanitizedResolvedBy) {
      throw new Error('Invalid input format');
    }

    return this.prisma.errorLog.update({ 
      where: { id: sanitizedId }, 
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: sanitizedResolvedBy } 
    });
  }

  async unresolve(id: string) {
    // Sanitize ID to prevent injection
    const sanitizedId = SanitizationUtil.sanitizeString(id);
    if (!sanitizedId) {
      throw new Error('Invalid error log ID format');
    }

    return this.prisma.errorLog.update({ 
      where: { id: sanitizedId }, 
      data: { resolved: false, resolvedAt: null, resolvedBy: null } 
    });
  }

  async delete(id: string) {
    // Sanitize ID to prevent injection
    const sanitizedId = SanitizationUtil.sanitizeString(id);
    if (!sanitizedId) {
      throw new Error('Invalid error log ID format');
    }

    return this.prisma.errorLog.delete({ where: { id: sanitizedId } });
  }

  async bulkDelete(ids: string[]) {
    // Sanitize all IDs to prevent injection
    const sanitizedIds = ids
      .map((id) => SanitizationUtil.sanitizeString(id))
      .filter((id): id is string => id !== null && id.length > 0);

    if (sanitizedIds.length === 0) {
      throw new Error('No valid IDs provided');
    }

    // Limit batch size to prevent abuse
    const maxBatchSize = 1000;
    const idsToProcess = sanitizedIds.slice(0, maxBatchSize);

    let deleted = 0, failed = 0, errors: string[] = [];
    for (const id of idsToProcess) {
      try { 
        await this.delete(id); 
        deleted++; 
      } catch (e) { 
        failed++; 
        errors.push(id); 
      }
    }
    return { deleted, failed, errors };
  }
  async export(filters: any, format: 'csv'|'json'|'xlsx' = 'csv'): Promise<string | Buffer> {
    const all = await this.findAll(filters);
    
    if (format === 'json') {
      return JSON.stringify(all.data, null, 2);
    }
    
    if (format === 'csv') {
      if (all.data.length === 0) {
        return '\uFEFF'; // Return BOM only if no data
      }
      
      // Helper function to escape CSV field
      const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) {
          return '';
        }
        const str = String(field);
        // Only quote if field contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = Object.keys(all.data[0]);
      const headerRow = headers.map(escapeCsvField).join(',');
      const dataRows = all.data.map((e: any) => 
        headers.map((key: string) => escapeCsvField(e[key])).join(',')
      );
      
      // Add UTF-8 BOM for Excel compatibility and use Windows line endings
      return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
    }
    
    if (format === 'xlsx') {
      return this.convertToXlsx(all.data);
    }
    
    return '';
  }

  private async convertToXlsx(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Errors');

    if (data.length === 0) {
      // Return empty workbook with headers if no data
      const emptyHeaders = ['ID', 'Message', 'Type', 'Source', 'Environment', 'Created At'];
      worksheet.columns = emptyHeaders.map(header => ({ header, key: header.toLowerCase().replace(' ', '') }));
      worksheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    }

    // Get headers from first row
    const headers = Object.keys(data[0]);
    const columns = headers.map((header) => ({
      header: header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
      key: header,
      width: header.length < 20 ? 20 : header.length + 5,
    }));

    worksheet.columns = columns;

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((row) => {
      worksheet.addRow(row);
    });

    // Auto-fit columns and set alignment
    worksheet.columns.forEach((column) => {
      if (column.header) {
        column.alignment = { vertical: 'top', wrapText: true };
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
  async getSources() {
    const rows = await this.prisma.errorLog.findMany({ select: { source: true }, distinct: ['source'], orderBy: { source: 'asc' }});
    return rows.map((e: any) => e.source);
  }
  async getTypes() {
    const rows = await this.prisma.errorLog.findMany({ select: { type: true }, distinct: ['type'], orderBy: { type: 'asc' }});
    return rows.map((e: any) => e.type);
  }
  async getEnvironments() {
    const rows = await this.prisma.errorLog.findMany({ select: { environment: true }, distinct: ['environment'], orderBy: { environment: 'asc' }});
    return rows.map((e: any) => e.environment);
  }
  async logError(fields: any) {
    // Ensure all required fields are provided or set defaults
    if (!fields.message || !fields.type || !fields.source || !fields.environment) {
      throw new Error('Missing required fields for error logging');
    }
    return this.prisma.errorLog.create({ data: fields });
  }
}
