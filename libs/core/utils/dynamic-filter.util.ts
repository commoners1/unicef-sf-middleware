import { Prisma } from '@prisma/client';
import type { ColumnFilter, ColumnFilters } from './column-filter.types';

/**
 * Dynamic filter interface that supports all filter types
 */
export interface DynamicFilters {
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Standard filters (can be extended per service)
  [key: string]: any;
  
  // Column filters for dynamic field filtering
  columnFilters?: ColumnFilters | string;
}

/**
 * Build Prisma orderBy from sort parameters
 */
export function buildOrderBy(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  allowedFields: string[] = [],
  defaultField: string = 'createdAt'
): Prisma.AuditLogOrderByWithRelationInput {
  // Validate and sanitize sort field
  const field = allowedFields.length > 0 && allowedFields.includes(sortBy || '')
    ? sortBy!
    : defaultField;

  return { [field]: sortOrder };
}

/**
 * Build Prisma where clause from column filters
 */
export function buildColumnFilterWhere(
  columnFilters: ColumnFilters
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  for (const [field, filter] of Object.entries(columnFilters)) {
    const filters = Array.isArray(filter) ? filter : [filter];
    
    if (filters.length > 1) {
      // Multiple filters for same field - use OR
      const orConditions: any[] = [];
      for (const colFilter of filters) {
        const condition = buildSingleColumnCondition(field, colFilter);
        if (condition !== null) {
          orConditions.push(condition);
        }
      }
      if (orConditions.length > 0) {
        (where as any)[field] = { OR: orConditions };
      }
    } else {
      // Single filter for field
      const condition = buildSingleColumnCondition(field, filters[0]);
      if (condition !== null) {
        (where as any)[field] = condition;
      }
    }
  }

  return where;
}

/**
 * Build a single column filter condition
 */
function buildSingleColumnCondition(
  field: string,
  colFilter: { operator: string; value: any; value2?: any }
): any {
  const { operator, value, value2 } = colFilter;
  const isDateField = field === 'createdAt' || field === 'updatedAt';
  
  switch (operator) {
    case 'equals':
      return value;
    case 'contains':
      return { contains: value, mode: 'insensitive' };
    case 'startsWith':
      return { startsWith: value, mode: 'insensitive' };
    case 'endsWith':
      return { endsWith: value, mode: 'insensitive' };
    case 'in':
      return { in: Array.isArray(value) ? value : [value] };
    case 'notIn':
      return { notIn: Array.isArray(value) ? value : [value] };
    case 'range':
      const range: any = {};
      if (value !== undefined && value !== null) {
        range.gte = isDateField ? new Date(value) : Number(value);
      }
      if (value2 !== undefined && value2 !== null) {
        range.lte = isDateField ? new Date(value2) : Number(value2);
      }
      return Object.keys(range).length > 0 ? range : null;
    case 'gte':
      return { gte: isDateField ? new Date(value) : Number(value) };
    case 'lte':
      return { lte: isDateField ? new Date(value) : Number(value) };
    case 'gt':
      return { gt: isDateField ? new Date(value) : Number(value) };
    case 'lt':
      return { lt: isDateField ? new Date(value) : Number(value) };
    default:
      return null;
  }
}

/**
 * Parse column filters from string or object
 */
export function parseColumnFilters(
  columnFilters?: ColumnFilters | string
): ColumnFilters | undefined {
  if (!columnFilters) return undefined;
  
  if (typeof columnFilters === 'string') {
    try {
      return JSON.parse(columnFilters) as ColumnFilters;
    } catch {
      return undefined;
    }
  }
  
  return columnFilters;
}

/**
 * Extract pagination parameters
 */
export function extractPagination(filters: DynamicFilters): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse boolean from query params (handles both boolean and string)
 */
export function parseBoolean(value: boolean | string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'boolean' ? value : String(value).toLowerCase() === 'true';
}

/**
 * Build date range filter for Prisma
 */
export function buildDateRangeFilter(
  startDate?: string,
  endDate?: string
): { gte?: Date; lte?: Date } | undefined {
  if (!startDate && !endDate) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

