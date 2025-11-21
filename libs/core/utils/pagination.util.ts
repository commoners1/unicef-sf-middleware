/**
 * Utility functions for pagination calculations
 */
export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
  defaultLimit?: number;
  maxLimit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export class PaginationUtil {
  /**
   * Calculate pagination values (page, limit, skip)
   */
  static calculate(params: PaginationParams): PaginationResult {
    const defaultLimit = params.defaultLimit || 50;
    const maxLimit = params.maxLimit || 1000;
    
    const page = Math.max(Number(params.page) || 1, 1);
    let limit = Math.max(Number(params.limit) || defaultLimit, 1);
    
    // Enforce max limit
    if (limit > maxLimit) {
      limit = maxLimit;
    }
    
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  /**
   * Create pagination metadata from results
   */
  static createMeta(
    page: number,
    limit: number,
    total: number,
  ): PaginationMeta {
    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Format pagination response
   */
  static formatResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ) {
    return {
      data,
      pagination: this.createMeta(page, limit, total),
    };
  }
}

