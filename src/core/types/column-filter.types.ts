/**
 * Column filter types for server-side filtering
 * These filters are sent from the frontend and applied on the backend
 */

export type ColumnFilterOperator =
  | 'equals' // Exact match
  | 'contains' // String contains (case-insensitive)
  | 'startsWith' // String starts with
  | 'endsWith' // String ends with
  | 'in' // Value in array
  | 'notIn' // Value not in array
  | 'range' // Numeric/date range (min-max)
  | 'gte' // Greater than or equal
  | 'lte' // Less than or equal
  | 'gt' // Greater than
  | 'lt'; // Less than

/**
 * Single column filter definition
 */
export interface ColumnFilter {
  field: string; // Field name (e.g., 'type', 'statusCode', 'createdAt')
  operator: ColumnFilterOperator; // Filter operator
  value: any; // Filter value(s)
  value2?: any; // Second value for range operators
}

/**
 * Collection of column filters
 */
export interface ColumnFilters {
  [field: string]: ColumnFilter | ColumnFilter[];
}

/**
 * Helper to create common column filters
 */
export class ColumnFilterBuilder {
  /**
   * Create an equals filter
   */
  static equals(field: string, value: any): ColumnFilter {
    return { field, operator: 'equals', value };
  }

  /**
   * Create a contains filter (for text search)
   */
  static contains(field: string, value: string): ColumnFilter {
    return { field, operator: 'contains', value };
  }

  /**
   * Create an "in" filter (for multiple values)
   */
  static in(field: string, values: any[]): ColumnFilter {
    return { field, operator: 'in', value: values };
  }

  /**
   * Create a range filter (for numeric or date ranges)
   */
  static range(field: string, min: any, max: any): ColumnFilter {
    return { field, operator: 'range', value: min, value2: max };
  }

  /**
   * Create a status code range filter (e.g., 200-299 for success)
   */
  static statusCodeRange(min: number, max: number): ColumnFilter {
    return { field: 'statusCode', operator: 'range', value: min, value2: max };
  }

  /**
   * Create a type filter for Salesforce response types
   */
  static responseType(types: string[]): ColumnFilter {
    return { field: 'type', operator: 'in', value: types };
  }
}
