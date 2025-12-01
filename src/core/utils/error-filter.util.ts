import { Prisma } from '@prisma/client';
import type { DynamicFilters } from './dynamic-filter.util';
import {
  buildOrderBy,
  extractPagination,
  parseColumnFilters,
  buildColumnFilterWhere,
  parseBoolean,
  buildDateRangeFilter,
} from './dynamic-filter.util';

export interface ErrorLogFilters extends DynamicFilters {
  type?: string;
  source?: string;
  environment?: string;
  resolved?: boolean | string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class ErrorFilterBuilder {
  static buildBaseFilters(filters: ErrorLogFilters): Prisma.ErrorLogWhereInput {
    const where: Prisma.ErrorLogWhereInput = {};

    // Type filter
    if (filters.type) {
      where.type = filters.type as any;
    }

    // Source filter
    if (filters.source) {
      where.source = { contains: filters.source, mode: 'insensitive' };
    }

    // Environment filter
    if (filters.environment) {
      where.environment = filters.environment as any;
    }

    const resolved = parseBoolean(filters.resolved);
    if (resolved !== undefined) where.resolved = resolved;

    const dateFilter = buildDateRangeFilter(filters.startDate, filters.endDate);
    if (dateFilter) where.createdAt = dateFilter;

    // Search filter across multiple fields
    if (filters.search) {
      where.OR = [
        { message: { contains: filters.search, mode: 'insensitive' } },
        { source: { contains: filters.search, mode: 'insensitive' } },
        { type: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const columnFilters = parseColumnFilters(filters.columnFilters);
    if (columnFilters && Object.keys(columnFilters).length > 0) {
      const columnFilterConditions = buildColumnFilterWhere(
        columnFilters as any,
      );
      Object.assign(where, columnFilterConditions);
    }

    return where;
  }

  static buildQuery(filters: ErrorLogFilters) {
    const where = this.buildBaseFilters(filters);
    const allowedSortFields = [
      'timestamp',
      'createdAt',
      'updatedAt',
      'type',
      'source',
      'environment',
    ];
    const orderBy = buildOrderBy(
      filters.sortBy,
      filters.sortOrder || 'desc',
      allowedSortFields,
      'timestamp',
    );
    const { page, limit, skip } = extractPagination(filters);

    return {
      where,
      orderBy,
      skip,
      take: limit,
      page,
      limit,
    };
  }
}
